import { describe, expect, it } from "vitest";
import { firebaseEnvKeys, validateFirebaseConfig } from "./firebaseConfig";

describe("firebase config validation", () => {
  it("reports every missing Firebase env key", () => {
    const result = validateFirebaseConfig({});

    expect(result.configured).toBe(false);
    if (!result.configured) {
      expect(result.missingKeys).toEqual(firebaseEnvKeys);
      expect(result.message).toBe("Firebase is not configured yet.");
    }
  });

  it("returns Firebase config when all env values are present", () => {
    const result = validateFirebaseConfig({
      VITE_FIREBASE_API_KEY: "api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "project-id",
      VITE_FIREBASE_STORAGE_BUCKET: "example.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "sender-id",
      VITE_FIREBASE_APP_ID: "app-id",
    });

    expect(result.configured).toBe(true);
    if (result.configured) {
      expect(result.config).toMatchObject({
        apiKey: "api-key",
        authDomain: "example.firebaseapp.com",
        projectId: "project-id",
      });
    }
  });
});
