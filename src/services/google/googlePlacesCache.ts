import type { GooglePlacesSearchResult, GoogleSearchSpec } from "./googlePlaceTypes";

export const GOOGLE_PLACES_CACHE_TTL_MS = 5 * 60 * 1000;

const placesCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<GooglePlacesSearchResult>;
  }
>();

export function buildGooglePlacesCacheKey(specs: GoogleSearchSpec[]) {
  return specs
    .map((spec) =>
      [
        spec.city,
        spec.layer,
        spec.query,
        spec.searchTag ?? "",
        spec.center.lat.toFixed(4),
        spec.center.lng.toFixed(4),
        spec.radius,
        spec.limit,
      ].join(":"),
    )
    .sort()
    .join("|");
}

export function getCachedGooglePlacesSearch(cacheKey: string) {
  const cached = placesCache.get(cacheKey);
  if (!cached) return undefined;

  if (cached.expiresAt <= Date.now()) {
    placesCache.delete(cacheKey);
    return undefined;
  }

  return cached.promise;
}

export function setCachedGooglePlacesSearch(
  cacheKey: string,
  promise: Promise<GooglePlacesSearchResult>,
  ttlMs = GOOGLE_PLACES_CACHE_TTL_MS,
) {
  placesCache.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    promise,
  });

  return promise;
}

export function deleteCachedGooglePlacesSearch(cacheKey: string) {
  placesCache.delete(cacheKey);
}

export function clearGooglePlacesCache() {
  placesCache.clear();
}

export function getGooglePlacesCacheSize() {
  return placesCache.size;
}
