import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

export type FirebaseServices = {
  auth: Auth | null;
  db: Firestore | null;
};

export type FirebaseServiceResult =
  | {
      ok: true;
      services: {
        auth: Auth;
        db: Firestore;
      };
    }
  | {
      ok: false;
      message: string;
    };
