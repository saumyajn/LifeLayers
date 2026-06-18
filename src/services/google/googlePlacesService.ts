import type { LayerId, Place } from "../../data/places";
import {
  estimateNeighborhood,
  googleSignal,
  inferLayerFromSearch,
  mapPresets,
  priceFromGoogle,
  radiusMilesToMeters,
} from "../../lib/lifelayers";
import { getGoogleMaps, importGoogleLibrary, logGoogleDevError } from "./googleMapsLoader";
import {
  buildGooglePlacesCacheKey,
  clearGooglePlacesCache,
  deleteCachedGooglePlacesSearch,
  getCachedGooglePlacesSearch,
  setCachedGooglePlacesSearch,
} from "./googlePlacesCache";
import type {
  GoogleNewPlaceLike,
  GooglePlacePhotoLike,
  GooglePlaceClass,
  GooglePlacesLibrary,
  GooglePlacesSearchInput,
  GooglePlacesSearchResult,
  GoogleSearchSpec,
} from "./googlePlaceTypes";
import { readLatLng } from "./googlePlaceTypes";

const NEW_PLACE_FIELDS = [
  "id",
  "displayName",
  "location",
  "businessStatus",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "priceLevel",
  "types",
  "photos",
  "regularOpeningHours",
  "currentOpeningHours",
];

export function createSearchSpecs({
  activeCity,
  activeLayer,
  liveSearchQuery,
  userLocation,
  searchRadiusMiles,
}: GooglePlacesSearchInput): GoogleSearchSpec[] {
  const nearbyRadius = radiusMilesToMeters(searchRadiusMiles);
  const cityTargets =
    activeCity === "nearby" && userLocation
      ? [
          {
            id: "nearby" as const,
            name: userLocation.label || "your area",
            city: "Near you" as const,
            preset: { lat: userLocation.lat, lng: userLocation.lng, zoom: 14 },
          },
        ]
      : activeCity === "nearby"
        ? []
        : activeCity === "all"
          ? [
              {
                id: "nyc" as const,
                name: "New York City",
                city: "NYC" as const,
                preset: mapPresets.nyc,
              },
              {
                id: "jc" as const,
                name: "Jersey City",
                city: "Jersey City" as const,
                preset: mapPresets.jc,
              },
            ]
          : [
              activeCity === "nyc"
                ? {
                    id: "nyc" as const,
                    name: "New York City",
                    city: "NYC" as const,
                    preset: mapPresets.nyc,
                  }
                : {
                    id: "jc" as const,
                    name: "Jersey City",
                    city: "Jersey City" as const,
                    preset: mapPresets.jc,
                  },
            ];

  const trimmedSearch = liveSearchQuery.trim();

  if (trimmedSearch) {
    const searchLayer = inferLayerFromSearch(trimmedSearch, activeLayer);

    return cityTargets.map((city) => ({
      layer: searchLayer,
      city: city.city,
      cityName: city.name,
      query: city.id === "nearby" ? trimmedSearch : `${trimmedSearch} ${city.name}`,
      searchTag: trimmedSearch,
      center: city.preset,
      limit: 60,
      radius: city.id === "nyc" ? 15000 : city.id === "nearby" ? nearbyRadius : 7000,
      pages: 3,
    }));
  }

  const layerTargets: LayerId[] =
    activeLayer === "all"
      ? ["eat", "do", "vibe", "memory"]
      : activeLayer === "reddit"
        ? []
        : [activeLayer];

  const broadQueryByLayer: Record<LayerId, string[]> = {
    eat: ["restaurants cafes bakeries coffee bars brunch pizza ramen food halls"],
    do: ["things to do parks museums galleries bookstores live music events"],
    reddit: [],
    memory: ["historic landmarks museums cultural sites architecture neighborhoods"],
    vibe: ["date spots cocktail bars rooftop bars quiet cafes waterfront lounges"],
  };

  const focusedQueryByLayer: Record<LayerId, string[]> = {
    eat: ["restaurants", "cafes coffee bakeries", "brunch pizza ramen bars"],
    do: ["things to do parks museums", "bookstores galleries live music events"],
    reddit: [],
    memory: ["historic landmarks museums", "cultural sites architecture"],
    vibe: ["date spots cocktail bars", "quiet cafes rooftops waterfront lounges"],
  };

  return cityTargets.flatMap((city) =>
    layerTargets.flatMap((layer) => {
      const queries = activeLayer === "all" ? broadQueryByLayer[layer] : focusedQueryByLayer[layer];

      return queries.map((query) => ({
        layer,
        city: city.city,
        cityName: city.name,
        query: city.id === "nearby" ? query : `${query} in ${city.name}`,
        searchTag: query,
        center: city.preset,
        limit: 60,
        radius: city.id === "nyc" ? 13500 : city.id === "nearby" ? nearbyRadius : 6500,
        pages: 3,
      }));
    }),
  );
}

export async function searchGooglePlaces(
  input: GooglePlacesSearchInput,
): Promise<GooglePlacesSearchResult> {
  const specs = createSearchSpecs(input);

  if (!specs.length) {
    return {
      places: [],
      source: "empty",
      message:
        input.activeCity === "nearby"
          ? "Share your location to search Google Places near you."
          : "This layer uses curated/community data. Switch layers or search Google Places.",
    };
  }

  const cacheKey = buildGooglePlacesCacheKey(specs);
  const cached = getCachedGooglePlacesSearch(cacheKey);
  if (cached) return cached;

  const promise = runGooglePlacesSearch(specs);
  setCachedGooglePlacesSearch(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    deleteCachedGooglePlacesSearch(cacheKey);
    throw error;
  }
}

async function runGooglePlacesSearch(specs: GoogleSearchSpec[]): Promise<GooglePlacesSearchResult> {
  try {
    const places = await searchWithNewPlacesApi(specs);
    return {
      places,
      source: "new",
      message: places.length
        ? "Live Google Places results loaded with the current Place API."
        : "No Google Places returned for this layer. Showing curated fallback.",
    };
  } catch (error) {
    logGoogleDevError("Google Places Place.searchByText failed; trying legacy fallback.", error);

    try {
      const legacyPlaces = await searchWithLegacyPlacesService(specs);
      return {
        places: legacyPlaces,
        source: "legacy",
        message: legacyPlaces.length
          ? "Live Google Places results loaded through the legacy compatibility layer."
          : getPlacesErrorMessage(error),
      };
    } catch (legacyError) {
      logGoogleDevError("Google Places legacy fallback failed.", legacyError);
      return {
        places: [],
        source: "empty",
        message: getPlacesErrorMessage(legacyError),
      };
    }
  }
}

async function searchWithNewPlacesApi(specs: GoogleSearchSpec[]) {
  const placesLibrary = await importGoogleLibrary<GooglePlacesLibrary>("places");
  const PlaceClass = placesLibrary.Place ?? getLegacyPlaceClass();

  if (typeof PlaceClass?.searchByText !== "function") {
    throw new Error("Google Places Place.searchByText is unavailable.");
  }

  const groups = await Promise.all(
    specs.map(async (spec) => {
      const response = await PlaceClass.searchByText?.({
        textQuery: spec.query,
        fields: NEW_PLACE_FIELDS,
        locationBias: {
          center: { lat: spec.center.lat, lng: spec.center.lng },
          radius: spec.radius,
        },
        language: "en-US",
        maxResultCount: Math.min(20, spec.limit),
        region: "us",
      });

      return Promise.all(
        (response?.places ?? [])
          .slice(0, spec.limit)
          .map((place) => placeFromGooglePlace(place, spec.layer, spec.city, spec.searchTag)),
      );
    }),
  );

  return dedupePlaces(groups.flat().filter((place): place is Place => Boolean(place)));
}

function getLegacyPlaceClass(): GooglePlaceClass | undefined {
  const google = getGoogleMaps();
  const places = google.maps?.places as { Place?: GooglePlaceClass } | undefined;
  return places?.Place;
}

async function placeFromGooglePlace(
  result: GoogleNewPlaceLike,
  layer: LayerId,
  city: Place["city"],
  searchTag?: string,
): Promise<Place | null> {
  const location = readLatLng(result.location ?? result.geometry?.location);
  const name = getPlaceName(result);

  if (!location || !name) return null;

  const rating = typeof result.rating === "number" ? result.rating : undefined;
  const total =
    typeof result.userRatingCount === "number"
      ? result.userRatingCount
      : typeof result.user_ratings_total === "number"
        ? result.user_ratings_total
        : undefined;
  const kind =
    Array.isArray(result.types) && result.types.length
      ? String(result.types[0]).replaceAll("_", " ")
      : layer === "eat"
        ? "Restaurant"
        : "Place";
  const price = getGooglePrice(result);
  const neighborhood =
    city === "Near you"
      ? (result.vicinity ?? "Near your location")
      : estimateNeighborhood(location.lat, location.lng, city);
  const signal = googleSignal(rating, total);
  const firstPhoto = Array.isArray(result.photos) ? result.photos[0] : undefined;
  const photoUrl = getPhotoUrl(firstPhoto);
  const photoAttributions = getPhotoAttributions(firstPhoto);
  const openNow = await getOpenStatus(result);
  const businessStatus = result.businessStatus ?? result.business_status;

  return {
    id: `google-${result.id ?? result.place_id ?? `${name}-${location.lat}-${location.lng}`}`,
    name,
    neighborhood,
    city,
    layer,
    kind,
    price,
    bestFor: [
      "live Google result",
      layer === "eat" ? "nearby food" : "nearby plan",
      layer === "eat" ? (price === "$" ? "budget" : "dining") : kind,
      searchTag,
    ].filter((tag): tag is string => Boolean(tag)),
    vibe: [
      layer === "eat" ? "food" : "discoverable",
      rating && rating >= 4.5 ? "high-rated" : "active",
    ],
    x: 0,
    y: 0,
    lat: location.lat,
    lng: location.lng,
    source: "google",
    googlePlaceId: result.id ?? result.place_id,
    photoUrl,
    photoAttributions,
    rating,
    userRatingsTotal: total,
    address: result.formattedAddress ?? result.formatted_address ?? result.vicinity,
    openNow,
    signal,
    mentions: total ?? 0,
    freshness: businessStatus === "OPERATIONAL" ? "Live on Google" : "Google result",
    summary: `${name} is a live Google Places result${
      rating ? ` rated ${rating.toFixed(1)}` : ""
    }${total ? ` from ${total.toLocaleString()} reviews` : ""}.`,
    localTip:
      result.formattedAddress ??
      result.formatted_address ??
      result.vicinity ??
      "Open in Google Maps for the latest details.",
    memory:
      layer === "memory"
        ? "Google identifies this as a cultural or landmark place; LifeLayers can add story context later."
        : "Live Google data gives the place surface; LifeLayers adds local context, Reddit pulse, and planning layers.",
    reddit: {
      subreddits: ["Google Places"],
      pulse: total && total > 1000 ? "Classic" : rating && rating >= 4.5 ? "Rising" : "Steady",
      consensus:
        "Sourced from Google Places. Reddit/community interpretation can be layered on top.",
      warnings: ["Check hours and availability before going"],
    },
  };
}

function getPlaceName(result: GoogleNewPlaceLike) {
  if (typeof result.displayName === "string") return result.displayName;
  if (typeof result.displayName?.text === "string") return result.displayName.text;
  if (typeof result.name === "string") return result.name;
  return "";
}

function getGooglePrice(result: GoogleNewPlaceLike): Place["price"] {
  if (typeof result.price_level === "number") return priceFromGoogle(result.price_level);
  if (typeof result.priceLevel === "number") return priceFromGoogle(result.priceLevel);

  const normalizedPrice = String(result.priceLevel ?? "").toUpperCase();
  if (normalizedPrice.includes("FREE")) return "Free";
  if (normalizedPrice.includes("INEXPENSIVE")) return "$";
  if (normalizedPrice.includes("MODERATE")) return "$$";
  return "$$$";
}

function getPhotoUrl(photo: GooglePlacePhotoLike | undefined) {
  if (!photo) return undefined;
  if (typeof photo.getURI === "function") return photo.getURI({ maxWidth: 960, maxHeight: 640 });
  if (typeof photo.getUrl === "function") return photo.getUrl({ maxWidth: 960, maxHeight: 640 });
  return undefined;
}

function getPhotoAttributions(photo: GooglePlacePhotoLike | undefined) {
  if (!photo) return undefined;
  if (Array.isArray(photo.html_attributions)) {
    return photo.html_attributions.map((attribution) => String(attribution));
  }
  if (Array.isArray(photo.authorAttributions)) {
    return photo.authorAttributions.map((attribution) =>
      [attribution.displayName, attribution.uri].filter(Boolean).join(" - "),
    );
  }
  return undefined;
}

async function getOpenStatus(place: GoogleNewPlaceLike) {
  if (typeof place.isOpen !== "function") return undefined;

  try {
    return await Promise.resolve(place.isOpen(new Date()));
  } catch {
    return undefined;
  }
}

// TODO: Remove this compatibility path once LifeLayers requires Places API (New)
// on every Google Cloud project. It is isolated here so UI components do not depend
// on deprecated PlacesService/textSearch directly.
async function searchWithLegacyPlacesService(specs: GoogleSearchSpec[]) {
  const google = getGoogleMaps();
  const PlacesService = (
    google.maps?.places as { PlacesService?: new (map: HTMLElement) => unknown }
  )?.PlacesService;
  const statusValues = (
    google.maps?.places as
      | {
          PlacesServiceStatus?: Record<string, string>;
        }
      | undefined
  )?.PlacesServiceStatus;

  if (!PlacesService || !statusValues) {
    throw new Error("Google Places library is unavailable.");
  }

  const serviceNode = document.createElement("div");
  const service = new PlacesService(serviceNode) as {
    textSearch: (
      request: {
        query: string;
        location: unknown;
        radius: number;
      },
      callback: (
        results: GoogleNewPlaceLike[] | null,
        status: string,
        pagination?: { hasNextPage: boolean; nextPage: () => void },
      ) => void,
    ) => void;
  };

  const groups = await Promise.all(
    specs.map((spec) => fetchLegacyTextSearch(service, statusValues, spec)),
  );
  return dedupePlaces(groups.flat());
}

function fetchLegacyTextSearch(
  service: {
    textSearch: (
      request: {
        query: string;
        location: unknown;
        radius: number;
      },
      callback: (
        results: GoogleNewPlaceLike[] | null,
        status: string,
        pagination?: { hasNextPage: boolean; nextPage: () => void },
      ) => void,
    ) => void;
  },
  statuses: Record<string, string>,
  spec: GoogleSearchSpec,
): Promise<Place[]> {
  return new Promise((resolve, reject) => {
    const google = getGoogleMaps();
    const LatLng = google.maps?.LatLng;

    if (!LatLng) {
      reject(new Error("Google Maps LatLng is unavailable."));
      return;
    }

    const collected: Place[] = [];
    let pageCount = 0;

    const handleResults = (
      results: GoogleNewPlaceLike[] | null,
      status: string,
      pagination?: { hasNextPage: boolean; nextPage: () => void },
    ) => {
      if (status === statuses.ZERO_RESULTS) {
        resolve(collected);
        return;
      }

      if (status === statuses.REQUEST_DENIED || status === statuses.OVER_QUERY_LIMIT) {
        reject(new Error(getPlacesStatusMessage(status)));
        return;
      }

      if (status !== statuses.OK || !results) {
        reject(new Error(getPlacesStatusMessage(status)));
        return;
      }

      pageCount += 1;
      Promise.all(
        results.map((result) =>
          placeFromGooglePlace(result, spec.layer, spec.city, spec.searchTag),
        ),
      ).then((places) => {
        collected.push(...places.filter((place): place is Place => Boolean(place)));

        const shouldFetchNextPage =
          Boolean(pagination?.hasNextPage) &&
          pageCount < spec.pages &&
          collected.length < spec.limit;

        if (shouldFetchNextPage) {
          window.setTimeout(() => pagination?.nextPage(), 900);
          return;
        }

        resolve(collected.slice(0, spec.limit));
      });
    };

    service.textSearch(
      {
        query: spec.query,
        location: new LatLng(spec.center.lat, spec.center.lng),
        radius: spec.radius,
      },
      handleResults,
    );
  });
}

function dedupePlaces(places: Place[]) {
  const seen = new Set<string>();
  return places
    .filter((place) => {
      const key = place.googlePlaceId ?? place.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.signal - a.signal);
}

function getPlacesStatusMessage(status: string) {
  if (status === "REQUEST_DENIED") {
    return "Google Places request denied. Check API key restrictions, billing, and enabled APIs.";
  }
  if (status === "OVER_QUERY_LIMIT") {
    return "Google Places quota limit reached. Showing curated fallback.";
  }
  if (status === "ZERO_RESULTS") {
    return "No Google Places returned for this layer. Showing curated fallback.";
  }
  if (status === "INVALID_REQUEST") {
    return "Google Places received an invalid request. Showing curated fallback.";
  }
  if (status === "UNKNOWN_ERROR") {
    return "Google Places had a temporary error. Showing curated fallback.";
  }
  return `Google Places returned ${status || "an unknown status"}. Showing curated fallback.`;
}

function getPlacesErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Google Places is unavailable.";
  if (message.includes("REQUEST_DENIED")) return getPlacesStatusMessage("REQUEST_DENIED");
  if (message.includes("OVER_QUERY_LIMIT")) return getPlacesStatusMessage("OVER_QUERY_LIMIT");
  if (message.includes("ZERO_RESULTS")) return getPlacesStatusMessage("ZERO_RESULTS");
  if (message.includes("INVALID_REQUEST")) return getPlacesStatusMessage("INVALID_REQUEST");
  if (message.includes("UNKNOWN_ERROR")) return getPlacesStatusMessage("UNKNOWN_ERROR");
  return message;
}

export const testableGooglePlacesService = {
  buildGooglePlacesCacheKey,
  clearGooglePlacesCache,
  createSearchSpecs,
  placeFromGooglePlace,
};
