import { afterEach, describe, expect, it } from "vitest";
import {
  buildGooglePlacesCacheKey,
  clearGooglePlacesCache,
  getCachedGooglePlacesSearch,
  getGooglePlacesCacheSize,
  setCachedGooglePlacesSearch,
} from "./googlePlacesCache";
import type { GooglePlacesSearchResult, GoogleSearchSpec } from "./googlePlaceTypes";

const searchSpecs: GoogleSearchSpec[] = [
  {
    layer: "eat",
    city: "Near you",
    cityName: "Current location",
    query: "coffee",
    searchTag: "coffee",
    center: { lat: 40.712345, lng: -74.005678, zoom: 14 },
    limit: 60,
    radius: 8047,
    pages: 3,
  },
  {
    layer: "do",
    city: "Near you",
    cityName: "Current location",
    query: "parks",
    searchTag: "parks",
    center: { lat: 40.712345, lng: -74.005678, zoom: 14 },
    limit: 60,
    radius: 8047,
    pages: 3,
  },
];

describe("googlePlacesCache", () => {
  afterEach(() => {
    clearGooglePlacesCache();
  });

  it("builds stable keys from city, layer, query, location, radius, and limit", () => {
    const forward = buildGooglePlacesCacheKey(searchSpecs);
    const reversed = buildGooglePlacesCacheKey([...searchSpecs].reverse());

    expect(forward).toBe(reversed);
    expect(forward).toContain("Near you:eat:coffee");
    expect(forward).toContain("40.7123:-74.0057:8047:60");
  });

  it("dedupes in-flight requests by returning the same cached promise", () => {
    const cacheKey = buildGooglePlacesCacheKey(searchSpecs);
    const promise = Promise.resolve<GooglePlacesSearchResult>({
      places: [],
      source: "empty",
      message: "No results",
    });

    setCachedGooglePlacesSearch(cacheKey, promise);

    expect(getCachedGooglePlacesSearch(cacheKey)).toBe(promise);
    expect(getGooglePlacesCacheSize()).toBe(1);
  });

  it("drops expired cached searches", () => {
    const cacheKey = buildGooglePlacesCacheKey(searchSpecs);
    const promise = Promise.resolve<GooglePlacesSearchResult>({
      places: [],
      source: "empty",
      message: "No results",
    });

    setCachedGooglePlacesSearch(cacheKey, promise, -1);

    expect(getCachedGooglePlacesSearch(cacheKey)).toBeUndefined();
    expect(getGooglePlacesCacheSize()).toBe(0);
  });
});
