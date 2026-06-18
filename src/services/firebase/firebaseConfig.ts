import type { FirebaseOptions } from "firebase/app";

export const firebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export type FirebaseEnvKey = (typeof firebaseEnvKeys)[number];

export type FirebaseConfigResult =
  | {
      configured: true;
      config: FirebaseOptions;
    }
  | {
      configured: false;
      missingKeys: FirebaseEnvKey[];
      message: string;
    };

export type FirebaseEnvSource = Partial<Record<FirebaseEnvKey, string | undefined>>;

export function validateFirebaseConfig(env: FirebaseEnvSource): FirebaseConfigResult {
  const missingKeys = firebaseEnvKeys.filter((key) => !env[key]?.trim());

  if (missingKeys.length) {
    return {
      configured: false,
      missingKeys,
      message: "Firebase is not configured yet.",
    };
  }

  return {
    configured: true,
    config: {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    },
  };
}

export function getFirebaseConfig() {
  const result = validateFirebaseConfig(import.meta.env);
  if (!result.configured) {
    logMissingFirebaseConfig(result.missingKeys);
  }

  return result;
}

function logMissingFirebaseConfig(missingKeys: FirebaseEnvKey[]) {
  if (!import.meta.env.DEV || !missingKeys.length) return;

  console.warn("[LifeLayers Firebase] Missing Firebase env keys:", missingKeys.join(", "));
}
