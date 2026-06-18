import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { LifeLayersUser } from "../auth/authTypes";
import { requireFirebaseServices } from "../../services/firebase/firebaseApp";
import { getFirestoreErrorMessage } from "../../services/firebase/firebaseErrors";
import type { PreferencesResult, UserPreferences } from "./preferencesTypes";
import { validateRemotePreferences } from "./preferencesValidation";

export async function loadUserPreferences(userId: string): Promise<PreferencesResult> {
  const firebase = requireFirebaseServices();
  if (!firebase.ok) {
    return {
      ok: false,
      message: "Firebase is not configured yet.",
    };
  }

  try {
    const snapshot = await getDoc(doc(firebase.services.db, "users", userId));
    const data = snapshot.data();

    return {
      ok: true,
      preferences: validateRemotePreferences(data?.preferences),
    };
  } catch (error) {
    return {
      ok: false,
      message: getFirestoreErrorMessage(error, "Could not load your saved LifeLayers setup."),
    };
  }
}

export async function saveUserPreferences(
  user: LifeLayersUser,
  preferences: UserPreferences,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const firebase = requireFirebaseServices();
  if (!firebase.ok) {
    return {
      ok: false,
      message: "Firebase is not configured yet.",
    };
  }

  try {
    await setDoc(
      doc(firebase.services.db, "users", user.uid),
      {
        profile: {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        },
        preferences,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getFirestoreErrorMessage(error, "Could not save your LifeLayers setup."),
    };
  }
}
