import type { Place } from "../../data/places";
import type { LifeLayersUser } from "../auth/authTypes";

export const REVIEW_TEXT_MAX_LENGTH = 1000;

export type ReviewPayload = {
  user: LifeLayersUser;
  place: Place;
  rating: number;
  text: string;
};

export type ReviewResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };
