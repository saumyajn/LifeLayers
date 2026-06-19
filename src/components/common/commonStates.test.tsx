import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { places } from "../../data/places";
import { ResultsBoard } from "../DiscoveryPanels";
import { PlaceDetail } from "../PlaceDetail";
import { EmptyState } from "./EmptyState";
import { ErrorBoundary } from "./ErrorBoundary";
import { LoadingState } from "./LoadingState";
import { ServiceUnavailableState } from "./ServiceUnavailableState";

function ThrowingChild(): ReactElement {
  throw new Error("forced render failure");
}

describe("common state components", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading, empty, and unavailable states with accessible roles", () => {
    render(
      <>
        <LoadingState title="Loading places" description="Checking the map." />
        <EmptyState title="Nothing here" description="Try another filter." />
        <ServiceUnavailableState service="Firebase" description="Configure Firebase env values." />
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading places");
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Firebase unavailable");
  });

  it("renders an app fallback when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("LifeLayers hit a display problem");
    expect(screen.getByRole("button", { name: "Reload app" })).toBeInTheDocument();
  });
});

describe("stateful production surfaces", () => {
  it("shows a no-results recovery action in the results board", () => {
    const onEmptyAction = vi.fn();

    render(
      <ResultsBoard
        places={[]}
        selectedId="missing"
        savedIds={[]}
        loading={false}
        loadingLabel="Refreshing live places"
        emptyTitle="No places match the active filters"
        emptyDescription="Clear a filter or widen the distance."
        emptyActionLabel="Clear filters"
        onEmptyAction={onEmptyAction}
        onPick={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByRole("heading", { name: /no places match/i })).toBeInTheDocument();
    expect(onEmptyAction).toHaveBeenCalledTimes(1);
  });

  it("keeps review submission disabled while saving", () => {
    render(
      <PlaceDetail
        place={places[0]}
        isSaved={false}
        currentUser={{
          uid: "user-1",
          displayName: "Test User",
          email: "test@example.com",
          photoURL: null,
        }}
        firebaseConfigured
        reviewRating={5}
        reviewText="Worth a visit."
        reviewStatus="Saving review..."
        reviewSubmitting
        onSave={vi.fn()}
        onCityClick={vi.fn()}
        onReviewRatingChange={vi.fn()}
        onReviewTextChange={vi.fn()}
        onSubmitReview={vi.fn()}
        onRequestSignIn={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Saving review");
  });
});
