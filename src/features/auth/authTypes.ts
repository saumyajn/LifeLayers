import type { User } from "firebase/auth";

export type LifeLayersUser = Pick<User, "uid" | "displayName" | "email" | "photoURL">;

export type AuthResult =
  | {
      ok: true;
      user?: LifeLayersUser;
    }
  | {
      ok: false;
      message: string;
      code?: string;
    };
