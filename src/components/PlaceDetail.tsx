import type { CSSProperties } from "react";
import type { Place } from "../data/places";
import type { LifeLayersUser } from "../features/auth/authTypes";
import { layerColor } from "../lib/lifelayers";

type PlaceDetailProps = {
  place: Place;
  isSaved: boolean;
  currentUser: LifeLayersUser | null;
  firebaseConfigured: boolean;
  reviewRating: number;
  reviewText: string;
  reviewStatus: string;
  reviewSubmitting: boolean;
  onSave: () => void;
  onCityClick: () => void;
  onReviewRatingChange: (rating: number) => void;
  onReviewTextChange: (text: string) => void;
  onSubmitReview: () => void;
  onRequestSignIn: () => void;
};

export function PlaceDetail({
  place,
  isSaved,
  onSave,
  onCityClick,
  currentUser,
  firebaseConfigured,
  reviewRating,
  reviewText,
  reviewStatus,
  reviewSubmitting,
  onReviewRatingChange,
  onReviewTextChange,
  onSubmitReview,
  onRequestSignIn,
}: PlaceDetailProps) {
  return (
    <article className="place-detail">
      <div
        className={place.photoUrl ? "place-visual has-photo" : "place-visual"}
        style={
          {
            "--accent": layerColor[place.layer],
          } as CSSProperties
        }
      >
        {place.photoUrl && <img src={place.photoUrl} alt="" loading="lazy" />}
        <span>{place.kind}</span>
        <strong>{place.neighborhood}</strong>
      </div>

      <div className="detail-heading">
        <div>
          <button className="city-pill" onClick={onCityClick}>
            {place.city}
          </button>
          <h2>{place.name}</h2>
          <p>
            {place.kind} - {place.price} - {place.freshness}
          </p>
          {place.address && <p className="address-line">{place.address}</p>}
        </div>
        <button className={isSaved ? "save-button saved" : "save-button"} onClick={onSave}>
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>

      <p className="place-summary">{place.summary}</p>

      <div className="signal-grid">
        <div>
          <span>{place.rating ? place.rating.toFixed(1) : place.signal}</span>
          <small>{place.rating ? "Rating" : "Signal"}</small>
        </div>
        <div>
          <span>{place.userRatingsTotal ?? place.mentions}</span>
          <small>{place.source === "google" ? "Reviews" : "Mentions"}</small>
        </div>
        <div>
          <span>
            {place.source === "google" && place.openNow === undefined
              ? "Hours unavailable"
              : place.openNow === undefined
                ? place.reddit.pulse
                : place.openNow
                  ? "Open"
                  : "Check"}
          </span>
          <small>{place.source === "google" ? "Hours" : "Pulse"}</small>
        </div>
      </div>

      <section className="detail-block">
        <h3>Local Tip</h3>
        <p>{place.localTip}</p>
      </section>

      <section className="detail-block">
        <h3>Reddit Consensus</h3>
        <p>{place.reddit.consensus}</p>
        <div className="subreddit-row">
          {place.reddit.subreddits.map((source) => (
            <span key={source}>{source}</span>
          ))}
        </div>
      </section>

      <section className="detail-block warning-block">
        <h3>Watch For</h3>
        <ul>
          {place.reddit.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </section>

      <section className="detail-block">
        <h3>Memory Layer</h3>
        <p>{place.memory}</p>
      </section>

      <section className="detail-block review-block">
        <div className="review-heading">
          <div>
            <h3>Your Review</h3>
            <p>
              {currentUser
                ? "Save your local read on this place."
                : "Sign in with Google to add reviews to LifeLayers."}
            </p>
          </div>
          <span>{place.source === "google" ? "Google place" : "Curated place"}</span>
        </div>

        {currentUser ? (
          <div className="review-form">
            <label>
              Rating
              <select
                value={reviewRating}
                onChange={(event) => onReviewRatingChange(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea
                value={reviewText}
                onChange={(event) => onReviewTextChange(event.target.value)}
                placeholder="What should someone know before going?"
                rows={3}
              />
            </label>
            <button
              className="primary-action"
              disabled={!firebaseConfigured || reviewSubmitting || !reviewText.trim()}
              onClick={onSubmitReview}
            >
              {reviewSubmitting ? "Saving..." : "Save review"}
            </button>
            {reviewStatus && <small className="review-status">{reviewStatus}</small>}
          </div>
        ) : (
          <div className="review-signin">
            <button
              className="secondary-action"
              disabled={!firebaseConfigured}
              onClick={onRequestSignIn}
            >
              Sign in to review
            </button>
            {!firebaseConfigured && <small>Firebase is not configured yet.</small>}
          </div>
        )}
      </section>

      <div className="tag-row">
        {place.bestFor.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </article>
  );
}
