import { useCallback, useRef, useState } from "react";
import type { Place } from "../data/places";
import type { LifeLayersUser } from "../features/auth/authTypes";
import { addUserReview } from "../features/reviews/reviewsService";
import type { ReviewStatus } from "../lib/lifelayers";

export function useReviews({
  currentUser,
  selectedPlace,
  setActionStatus,
}: {
  currentUser: LifeLayersUser | null;
  selectedPlace: Place;
  setActionStatus: (message: string) => void;
}) {
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submitReview = useCallback(async () => {
    if (submittingRef.current) return;

    if (!currentUser) {
      setReviewStatus({
        placeId: selectedPlace.id,
        message: "Sign in with Google to save reviews.",
      });
      return;
    }

    const trimmedReview = reviewText.trim();
    if (!trimmedReview) {
      setReviewStatus({ placeId: selectedPlace.id, message: "Add a short review before saving." });
      return;
    }

    setReviewStatus({ placeId: selectedPlace.id, message: "Saving review..." });
    setReviewSubmitting(true);
    submittingRef.current = true;

    try {
      const result = await addUserReview({
        user: currentUser,
        place: selectedPlace,
        rating: reviewRating,
        text: trimmedReview,
      });

      if (result.ok) {
        setReviewText("");
        setReviewRating(5);
        setReviewStatus({ placeId: selectedPlace.id, message: "Review saved to LifeLayers." });
        setActionStatus("Your review was saved to Firestore.");
      } else {
        setReviewStatus({ placeId: selectedPlace.id, message: result.message });
      }
    } catch {
      setReviewStatus({ placeId: selectedPlace.id, message: "Could not save your review." });
    } finally {
      submittingRef.current = false;
      setReviewSubmitting(false);
    }
  }, [currentUser, reviewRating, reviewText, selectedPlace, setActionStatus]);

  return {
    reviewRating,
    setReviewRating,
    reviewText,
    setReviewText,
    reviewStatus,
    reviewSubmitting,
    submitReview,
  };
}
