import { describe, expect, it } from "vitest";
import { places } from "../../data/places";
import { REVIEW_TEXT_MAX_LENGTH, type ReviewPayload } from "./reviewsTypes";
import { validateReviewPayload } from "./reviewsValidation";

const validPayload: ReviewPayload = {
  user: {
    uid: "user-1",
    displayName: "Test User",
    email: "test@example.com",
    photoURL: null,
  },
  place: places[0],
  rating: 5,
  text: "Loved it.",
};

describe("review validation", () => {
  it("accepts valid review payloads", () => {
    expect(validateReviewPayload(validPayload)).toBeNull();
  });

  it("rejects rating values outside 1 to 5", () => {
    expect(validateReviewPayload({ ...validPayload, rating: 0 })).toContain("1 to 5");
    expect(validateReviewPayload({ ...validPayload, rating: 6 })).toContain("1 to 5");
  });

  it("rejects empty or oversized review text", () => {
    expect(validateReviewPayload({ ...validPayload, text: " " })).toContain("short review");
    expect(
      validateReviewPayload({
        ...validPayload,
        text: "x".repeat(REVIEW_TEXT_MAX_LENGTH + 1),
      }),
    ).toContain(`${REVIEW_TEXT_MAX_LENGTH} characters`);
  });
});
