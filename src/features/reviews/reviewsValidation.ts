import { REVIEW_TEXT_MAX_LENGTH, type ReviewPayload } from "./reviewsTypes";

export function validateReviewPayload(payload: ReviewPayload) {
  if (!payload.user.uid) {
    return "Sign in with Google before saving a review.";
  }

  if (!payload.place.id) {
    return "Choose a place before saving a review.";
  }

  if (!Number.isFinite(payload.rating) || payload.rating < 1 || payload.rating > 5) {
    return "Choose a rating from 1 to 5.";
  }

  if (typeof payload.text !== "string" || !payload.text.trim()) {
    return "Add a short review before saving.";
  }

  if (payload.text.trim().length > REVIEW_TEXT_MAX_LENGTH) {
    return `Keep reviews under ${REVIEW_TEXT_MAX_LENGTH} characters.`;
  }

  return null;
}
