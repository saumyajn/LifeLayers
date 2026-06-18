import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFirebaseConfig } from "./firebaseConfig";
import type { FirebaseServiceResult, FirebaseServices } from "./firebaseTypes";

const configResult = getFirebaseConfig();

const app = configResult.configured
  ? getApps().length
    ? getApp()
    : initializeApp(configResult.config)
  : null;

const services: FirebaseServices = {
  auth: app ? getAuth(app) : null,
  db: app ? getFirestore(app) : null,
};

export const firebaseConfigStatus = configResult;
export const isFirebaseConfigured = configResult.configured;

export function getFirebaseServices() {
  return services;
}

export function requireFirebaseServices(): FirebaseServiceResult {
  if (!services.auth || !services.db) {
    return {
      ok: false,
      message: "Firebase is not configured yet.",
    };
  }

  return {
    ok: true,
    services: {
      auth: services.auth,
      db: services.db,
    },
  };
}
