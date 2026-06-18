import { describe, expect, it } from "vitest";
import { validateRemotePreferences } from "./preferencesValidation";

describe("preferences validation", () => {
  it("accepts valid remote preference fields", () => {
    const preferences = validateRemotePreferences({
      activeLayer: "eat",
      activeCity: "nearby",
      priceFilter: "$",
      vibeFilter: "quiet",
      subcategoryFilter: "indian",
      pulseFilter: "Rising",
      sortMode: "rating",
      savedOnly: true,
      savedIds: ["place-1"],
      liveSearchQuery: "coffee",
      searchRadiusMiles: 25,
      savedLocations: [
        {
          lat: 40.7,
          lng: -74,
          label: "Test City",
          source: "search",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      userLocation: {
        lat: 40.7,
        lng: -74,
        label: "Test City",
        source: "search",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(preferences).toMatchObject({
      activeLayer: "eat",
      activeCity: "nearby",
      priceFilter: "$",
      sortMode: "rating",
      savedOnly: true,
      savedIds: ["place-1"],
      searchRadiusMiles: 25,
    });
    expect(preferences?.savedLocations?.[0]).toMatchObject({
      source: "saved",
      radiusMiles: 25,
    });
  });

  it("drops invalid remote preference fields and keeps valid ones", () => {
    const preferences = validateRemotePreferences({
      activeLayer: "bad-layer",
      activeCity: "mars",
      priceFilter: "expensive",
      savedOnly: "yes",
      savedIds: ["valid-id", 123, ""],
      searchRadiusMiles: 999,
      liveSearchQuery: "parks",
    });

    expect(preferences).toEqual({
      savedIds: ["valid-id"],
      liveSearchQuery: "parks",
    });
  });
});
