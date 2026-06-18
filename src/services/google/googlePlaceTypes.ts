import type { CityId, LayerId, Place } from "../../data/places";

export type GoogleLatLngLiteral = { lat: number; lng: number };

export type GoogleLatLngValue =
  | GoogleLatLngLiteral
  | {
      lat: () => number;
      lng: () => number;
    };

export type GoogleBoundsLike = {
  getNorthEast: () => GoogleLatLngValue;
};

export type GoogleMapsListener = {
  remove: () => void;
};

export type GoogleMapLike = {
  setCenter: (center: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: unknown, padding?: number) => void;
  panTo: (center: GoogleLatLngLiteral) => void;
  getCenter: () => GoogleLatLngValue | undefined;
  getBounds: () => GoogleBoundsLike | undefined;
  getZoom: () => number | undefined;
  addListener: (eventName: string, handler: () => void) => GoogleMapsListener;
};

export type GoogleMarkerLibrary = {
  AdvancedMarkerElement?: new (options: {
    map: GoogleMapLike;
    position: GoogleLatLngLiteral;
    title?: string;
    content?: HTMLElement;
  }) => GoogleAdvancedMarkerLike;
  PinElement?: new (options: {
    background?: string;
    borderColor?: string;
    glyph?: string;
    glyphColor?: string;
    scale?: number;
  }) => {
    element: HTMLElement;
  };
};

export type GoogleAdvancedMarkerLike = {
  map: GoogleMapLike | null;
  addListener?: (eventName: string, handler: () => void) => GoogleMapsListener;
};

export type GoogleLegacyMarkerLike = {
  setMap: (map: GoogleMapLike | null) => void;
  addListener?: (eventName: string, handler: () => void) => GoogleMapsListener;
};

export type ManagedGoogleMarker = {
  marker: GoogleAdvancedMarkerLike | GoogleLegacyMarkerLike;
  listeners: GoogleMapsListener[];
};

export type GooglePlacePhotoLike = {
  getURI?: (options?: { maxWidth?: number; maxHeight?: number }) => string;
  getUrl?: (options?: { maxWidth?: number; maxHeight?: number }) => string;
  html_attributions?: unknown[];
  authorAttributions?: Array<{ displayName?: string; uri?: string }>;
};

export type GoogleNewPlaceLike = {
  id?: string;
  place_id?: string;
  displayName?: string | { text?: string };
  name?: string;
  location?: GoogleLatLngValue;
  geometry?: { location?: GoogleLatLngValue };
  formattedAddress?: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  userRatingCount?: number;
  user_ratings_total?: number;
  priceLevel?: number | string;
  price_level?: number;
  types?: string[];
  photos?: GooglePlacePhotoLike[];
  businessStatus?: string;
  business_status?: string;
  regularOpeningHours?: unknown;
  currentOpeningHours?: unknown;
  isOpen?: (date?: Date) => boolean | Promise<boolean>;
  fetchFields?: (request: { fields: string[] }) => Promise<unknown>;
};

export type GooglePlaceClass = {
  new (options: { id: string }): GoogleNewPlaceLike;
  searchByText?: (request: {
    textQuery: string;
    fields: string[];
    locationBias?: { center: GoogleLatLngLiteral; radius: number };
    language?: string;
    maxResultCount?: number;
    region?: string;
  }) => Promise<{ places?: GoogleNewPlaceLike[] }>;
};

export type GooglePlacesLibrary = {
  Place?: GooglePlaceClass;
};

export type GoogleSearchSpec = {
  layer: LayerId;
  city: Place["city"];
  cityName: string;
  query: string;
  searchTag?: string;
  center: { lat: number; lng: number; zoom: number };
  limit: number;
  radius: number;
  pages: number;
};

export type GooglePlacesSearchInput = {
  activeCity: CityId;
  activeLayer: LayerId | "all";
  liveSearchQuery: string;
  userLocation?: {
    lat: number;
    lng: number;
    label: string;
  } | null;
  searchRadiusMiles: number;
};

export type GooglePlacesSearchResult = {
  places: Place[];
  source: "new" | "legacy" | "empty";
  message: string;
};

export function readLatLng(value: GoogleLatLngValue | undefined): GoogleLatLngLiteral | null {
  if (!value) return null;

  if (typeof value.lat === "function" && typeof value.lng === "function") {
    return {
      lat: value.lat(),
      lng: value.lng(),
    };
  }

  if (typeof value.lat === "number" && typeof value.lng === "number") {
    return {
      lat: value.lat,
      lng: value.lng,
    };
  }

  return null;
}
