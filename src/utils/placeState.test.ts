import { describe, expect, it } from "vitest";
import { places } from "../data/places";
import {
  buildCsvExportContent,
  buildPlaceShareUrl,
  getActiveFilterCount,
  toggleSavedId,
  type ActiveFilterSummary,
} from "./placeState";

const baseFilterSummary: ActiveFilterSummary = {
  activeCity: "all",
  activeLayer: "all",
  priceFilter: "all",
  vibeFilter: "all",
  pulseFilter: "all",
  subcategoryFilter: "all",
  sortMode: "signal",
  savedOnly: false,
  query: "",
  liveSearchQuery: "",
  userLocation: null,
  searchRadiusMiles: 25,
};

describe("place state utilities", () => {
  it("counts active filters the same way the filter bar displays chips", () => {
    expect(getActiveFilterCount(baseFilterSummary)).toBe(0);

    expect(
      getActiveFilterCount({
        ...baseFilterSummary,
        activeCity: "nearby",
        activeLayer: "eat",
        priceFilter: "$",
        savedOnly: true,
      }),
    ).toBe(5);
  });

  it("toggles saved place ids without mutating the current list", () => {
    const initial = ["a", "b"];

    expect(toggleSavedId(initial, "c")).toEqual(["a", "b", "c"]);
    expect(toggleSavedId(initial, "a")).toEqual(["b"]);
    expect(initial).toEqual(["a", "b"]);
  });

  it("formats CSV exports with escaped values", () => {
    const csv = buildCsvExportContent([
      {
        ...places[0],
        name: 'Place with "quotes"',
      },
    ]);

    expect(csv).toContain('"Name","City","Neighborhood"');
    expect(csv).toContain('"Place with ""quotes"""');
  });

  it("builds selected-place share URLs from the current page", () => {
    const url = buildPlaceShareUrl(places[0], "https://lifelayers.example/app?mode=plan");

    expect(url).toBe(`https://lifelayers.example/app?mode=plan&place=${places[0].id}`);
  });
});
