import { useCallback, useState } from "react";
import type { Place } from "../data/places";
import { addUserReview, type LifeLayersUser } from "../firebase";
import { getErrorMessage, type ReviewStatus } from "../lib/lifelayers";

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

  const submitReview = useCallback(async () => {
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

    try {
      await addUserReview({
        user: currentUser,
        place: selectedPlace,
        rating: reviewRating,
        text: trimmedReview,
      });
      setReviewText("");
      setReviewRating(5);
      setReviewStatus({ placeId: selectedPlace.id, message: "Review saved to LifeLayers." });
      setActionStatus("Your review was saved to Firestore.");
    } catch (error) {
      setReviewStatus({ placeId: selectedPlace.id, message: getErrorMessage(error) });
    }
  }, [currentUser, reviewRating, reviewText, selectedPlace, setActionStatus]);

  return {
    reviewRating,
    setReviewRating,
    reviewText,
    setReviewText,
    reviewStatus,
    submitReview,
  };
}
