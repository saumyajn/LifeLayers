import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseServices, requireFirebaseServices } from "../../services/firebase/firebaseApp";
import { getAuthErrorMessage, logFirebaseDevError } from "../../services/firebase/firebaseErrors";
import type { AuthResult, LifeLayersUser } from "./authTypes";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function toLifeLayersUser(user: User): LifeLayersUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export function listenForUser(onChange: (user: LifeLayersUser | null) => void) {
  const { auth } = getFirebaseServices();

  if (!auth) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => onChange(user ? toLifeLayersUser(user) : null));
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const firebase = requireFirebaseServices();
  if (!firebase.ok) {
    return {
      ok: false,
      message: "Google login is not configured yet.",
    };
  }

  try {
    const result = await signInWithPopup(firebase.services.auth, googleProvider);
    return {
      ok: true,
      user: toLifeLayersUser(result.user),
    };
  } catch (error) {
    if (error instanceof FirebaseError) {
      logFirebaseDevError("Google sign-in failed.", error);

      if (error.code === "auth/popup-blocked") {
        await signInWithRedirect(firebase.services.auth, googleProvider);
        return {
          ok: true,
        };
      }

      return {
        ok: false,
        message: getAuthErrorMessage(error.code),
        code: error.code,
      };
    }

    logFirebaseDevError("Google sign-in failed.", error);
    return {
      ok: false,
      message: "Google login failed. Please try again.",
    };
  }
}

export async function signOutUser(): Promise<AuthResult> {
  const firebase = requireFirebaseServices();
  if (!firebase.ok) {
    return {
      ok: false,
      message: "Google login is not configured yet.",
    };
  }

  try {
    await signOut(firebase.services.auth);
    return { ok: true };
  } catch (error) {
    if (error instanceof FirebaseError) {
      logFirebaseDevError("Sign out failed.", error);
      return {
        ok: false,
        message: getAuthErrorMessage(error.code),
        code: error.code,
      };
    }

    logFirebaseDevError("Sign out failed.", error);
    return {
      ok: false,
      message: "Google login failed. Please try again.",
    };
  }
}
