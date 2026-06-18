import { describe, expect, it } from "vitest";
import { loadGoogleMaps } from "./googleMapsLoader";
import { searchGooglePlaces, testableGooglePlacesService } from "./googlePlacesService";

describe("googlePlacesService", () => {
  it("builds stable cache keys regardless of spec order", () => {
    const specs = testableGooglePlacesService.createSearchSpecs({
      activeCity: "all",
      activeLayer: "eat",
      liveSearchQuery: "",
      userLocation: null,
      searchRadiusMiles: 25,
    });

    const forward = testableGooglePlacesService.buildGooglePlacesCacheKey(specs);
    const reversed = testableGooglePlacesService.buildGooglePlacesCacheKey([...specs].reverse());

    expect(forward).toBe(reversed);
    expect(forward).toContain("restaurants");
  });

  it("normalizes Place API results into the LifeLayers place model", async () => {
    const place = await testableGooglePlacesService.placeFromGooglePlace(
      {
        id: "abc123",
        displayName: "Test Cafe",
        location: { lat: 40.7, lng: -73.9 },
        formattedAddress: "1 Test St",
        rating: 4.7,
        userRatingCount: 123,
        priceLevel: "PRICE_LEVEL_MODERATE",
        types: ["cafe"],
        businessStatus: "OPERATIONAL",
        photos: [
          {
            getURI: () => "https://example.com/photo.jpg",
            authorAttributions: [{ displayName: "Google" }],
          },
        ],
        isOpen: () => true,
      },
      "eat",
      "Near you",
      "coffee",
    );

    expect(place).toMatchObject({
      id: "google-abc123",
      name: "Test Cafe",
      city: "Near you",
      layer: "eat",
      price: "$$",
      openNow: true,
      source: "google",
      googlePlaceId: "abc123",
    });
    expect(place?.photoUrl).toBe("https://example.com/photo.jpg");
  });

  it("returns a no-location fallback instead of throwing for nearby searches without location", async () => {
    const result = await searchGooglePlaces({
      activeCity: "nearby",
      activeLayer: "all",
      liveSearchQuery: "",
      userLocation: null,
      searchRadiusMiles: 25,
    });

    expect(result.places).toEqual([]);
    expect(result.message).toContain("Share your location");
  });

  it("rejects missing Google Maps API keys before loading scripts", async () => {
    await expect(loadGoogleMaps("")).rejects.toThrow("Missing Google Maps API key");
  });
});
