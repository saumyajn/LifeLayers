import { initializeApp, getApp, getApps, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
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
};

export type LifeLayersUser = Pick<User, "uid" | "displayName" | "email" | "photoURL">;

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

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

function requireFirebase() {
  if (!auth || !db) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to .env.local.");
  }

  return { auth, db };
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

export async function signInWithGoogle() {
  const { auth } = requireFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return toLifeLayersUser(result.user);
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
