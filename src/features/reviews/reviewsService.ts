import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { requireFirebaseServices } from "../../services/firebase/firebaseApp";
import { getFirestoreErrorMessage } from "../../services/firebase/firebaseErrors";
import type { ReviewPayload, ReviewResult } from "./reviewsTypes";
import { validateReviewPayload } from "./reviewsValidation";

export async function addUserReview(payload: ReviewPayload): Promise<ReviewResult> {
  const validationMessage = validateReviewPayload(payload);
  if (validationMessage) {
    return {
      ok: false,
      message: validationMessage,
    };
  }

  const firebase = requireFirebaseServices();
  if (!firebase.ok) {
    return {
      ok: false,
      message: "Firebase is not configured yet.",
    };
  }

  try {
    await addDoc(collection(firebase.services.db, "reviews"), {
      userId: payload.user.uid,
      userName: payload.user.displayName,
      userEmail: payload.user.email,
      placeId: payload.place.id,
      googlePlaceId: payload.place.googlePlaceId ?? null,
      placeName: payload.place.name,
      city: payload.place.city,
      neighborhood: payload.place.neighborhood,
      layer: payload.place.layer,
      kind: payload.place.kind,
      rating: payload.rating,
      text: payload.text.trim(),
      source: payload.place.source ?? "curated",
      createdAt: serverTimestamp(),
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getFirestoreErrorMessage(error, "Could not save your review."),
    };
  }
}
