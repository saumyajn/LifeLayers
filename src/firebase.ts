import { FirebaseError, initializeApp, getApp, getApps, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { CityId, LayerId, Place } from "./data/places";
import type { UserLocation } from "./lib/lifelayers";

export type UserPreferences = {
  activeLayer: LayerId | "all";
  activeCity: CityId;
  priceFilter: Place["price"] | "all";
  vibeFilter: string;
  subcategoryFilter: string;
  pulseFilter: Place["reddit"]["pulse"] | "all";
  sortMode: "signal" | "rating" | "reviews" | "name";
  savedOnly: boolean;
  savedIds: string[];
  liveSearchQuery: string;
  userLocation: UserLocation | null;
  savedLocations: UserLocation[];
  searchRadiusMiles: number;
};

export type LifeLayersUser = Pick<User, "uid" | "displayName" | "email" | "photoURL">;

type AuthResult =
  | {
      ok: true;
      user?: LifeLayersUser;
    }
  | {
      ok: false;
      message: string;
      code?: string;
    };

type ReviewPayload = {
  user: LifeLayersUser;
  place: Place;
  rating: number;
  text: string;
};

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean);

const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

function requireFirebase() {
  if (!auth || !db) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to .env.local.");
  }

  return { auth, db };
}

function getAuthErrorMessage(code: string) {
  switch (code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google login in Firebase.";
    case "auth/operation-not-allowed":
      return "Google login is not enabled in Firebase.";
    case "auth/popup-blocked":
      return "The login popup was blocked. Redirecting instead.";
    case "auth/popup-closed-by-user":
      return "The login window was closed before completing sign-in.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid or missing.";
    case "auth/configuration-not-found":
      return "Firebase authentication is not configured correctly.";
    default:
      return "Google login failed. Please try again.";
  }
}

export function toLifeLayersUser(user: User): LifeLayersUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export function listenForUser(onChange: (user: LifeLayersUser | null) => void) {
  if (!auth) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => onChange(user ? toLifeLayersUser(user) : null));
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!auth) {
    return {
      ok: false,
      message: "Google login is not configured yet.",
    };
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    return {
      ok: true,
      user: toLifeLayersUser(result.user),
    };
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, provider);
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

    return {
      ok: false,
      message: "Google login failed. Please try again.",
    };
  }
}

export async function signOutUser() {
  const { auth } = requireFirebase();
  await signOut(auth);
}

export async function loadUserPreferences(userId: string) {
  const { db } = requireFirebase();
  const snapshot = await getDoc(doc(db, "users", userId));
  const data = snapshot.data();

  return data?.preferences as Partial<UserPreferences> | undefined;
}

export async function saveUserPreferences(user: LifeLayersUser, preferences: UserPreferences) {
  const { db } = requireFirebase();

  await setDoc(
    doc(db, "users", user.uid),
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
}

export async function addUserReview({ user, place, rating, text }: ReviewPayload) {
  const { db } = requireFirebase();

  await addDoc(collection(db, "reviews"), {
    userId: user.uid,
    userName: user.displayName,
    userEmail: user.email,
    placeId: place.id,
    googlePlaceId: place.googlePlaceId ?? null,
    placeName: place.name,
    city: place.city,
    neighborhood: place.neighborhood,
    layer: place.layer,
    kind: place.kind,
    rating,
    text,
    source: place.source,
    createdAt: serverTimestamp(),
  });
}
