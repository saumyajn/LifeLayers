import { FirebaseError } from "firebase/app";

export function getAuthErrorMessage(code: string) {
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

export function getFirestoreErrorMessage(error: unknown, fallback: string) {
  if (error instanceof FirebaseError) {
    logFirebaseDevError(fallback, error);
    return getFirestoreCodeMessage(error.code, fallback);
  }

  logFirebaseDevError(fallback, error);
  return fallback;
}

export function logFirebaseDevError(context: string, error: unknown) {
  if (!import.meta.env.DEV) return;

  if (error instanceof FirebaseError) {
    console.warn(`[LifeLayers Firebase] ${context}`, error.code);
    return;
  }

  if (error instanceof Error) {
    console.warn(`[LifeLayers Firebase] ${context}`, error.message);
    return;
  }

  console.warn(`[LifeLayers Firebase] ${context}`, String(error));
}

function getFirestoreCodeMessage(code: string, fallback: string) {
  switch (code) {
    case "permission-denied":
      return "Firebase denied this request. Check Firestore rules and sign-in state.";
    case "unavailable":
      return "Firebase is temporarily unavailable. Please try again.";
    case "resource-exhausted":
      return "Firebase quota was reached. Please try again later.";
    case "unauthenticated":
      return "Sign in with Google before saving to Firebase.";
    default:
      return fallback;
  }
}
