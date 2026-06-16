import type { CityId, LayerId, Place } from "../data/places";
import { layers, neighborhoods } from "../data/places";

export type PriceFilter = "all" | Place["price"];
export type PulseFilter = "all" | Place["reddit"]["pulse"];
export type SortMode = "signal" | "rating" | "reviews" | "name";

export type LiveStatus = {
  source: "curated" | "google";
  message: string;
  count: number;
  loading: boolean;
};

export type ReviewStatus = {
  placeId: string;
  message: string;
};

export type ExportPlace = Pick<
  Place,
  | "name"
  | "city"
  | "neighborhood"
  | "layer"
  | "kind"
  | "price"
  | "rating"
  | "userRatingsTotal"
  | "signal"
  | "address"
  | "source"
  | "googlePlaceId"
  | "localTip"
>;

export const cityOptions: Array<{ id: CityId; label: string }> = [
  { id: "all", label: "NYC + JC" },
  { id: "nyc", label: "NYC" },
  { id: "jc", label: "Jersey City" },
];

export const priceOptions: Array<{ id: PriceFilter; label: string }> = [
  { id: "all", label: "Any price" },
  { id: "Free", label: "Free" },
  { id: "$", label: "$" },
  { id: "$$", label: "$$" },
  { id: "$$$", label: "$$$" },
];

export const pulseOptions: Array<{ id: PulseFilter; label: string }> = [
  { id: "all", label: "Any pulse" },
  { id: "Rising", label: "Rising" },
  { id: "Steady", label: "Steady" },
  { id: "Classic", label: "Classic" },
  { id: "Quiet", label: "Quiet" },
];

export const sortOptions: Array<{ id: SortMode; label: string }> = [
  { id: "signal", label: "Best LifeLayers signal" },
  { id: "rating", label: "Highest Google rating" },
  { id: "reviews", label: "Most Google reviews" },
  { id: "name", label: "A to Z" },
];

export const planPresets = [
  { label: "Date night", query: "date night", layer: "all" as const, price: "all" as const },
  { label: "Under $20", query: "under $20", layer: "eat" as const, price: "$" as const },
  { label: "Rainy day", query: "rainy day", layer: "all" as const, price: "all" as const },
  { label: "Late night", query: "late night", layer: "eat" as const, price: "all" as const },
  { label: "Free walk", query: "walks", layer: "do" as const, price: "Free" as const },
  { label: "Local debate", query: "", layer: "reddit" as const, price: "all" as const },
];

export type PlanPreset = (typeof planPresets)[number];

export const layerColor: Record<LayerId, string> = {
  eat: "#d9532f",
  do: "#227c70",
  reddit: "#7752a3",
  memory: "#b88917",
  vibe: "#2b68a8",
};

export const mapPresets: Record<CityId, { lat: number; lng: number; zoom: number }> = {
  all: { lat: 40.724, lng: -73.995, zoom: 11 },
  nyc: { lat: 40.728, lng: -73.985, zoom: 12 },
  jc: { lat: 40.723, lng: -74.049, zoom: 13 },
};

export const tileSize = 256;

export type MapPoint = {
  x: number;
  y: number;
};

export function lngLatToWorld(lng: number, lat: number, zoom: number): MapPoint {
  const scale = tileSize * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

export function clampZoom(zoom: number) {
  return Math.max(11, Math.min(15, zoom));
}

export function cityMatches(place: Place, city: CityId) {
  if (city === "all") return true;
  return city === "nyc" ? place.city === "NYC" : place.city === "Jersey City";
}

export function layerMatches(place: Place, layer: LayerId | "all") {
  return layer === "all" || place.layer === layer;
}

export function textMatches(place: Place, query: string) {
  const target = [
    place.name,
    place.neighborhood,
    place.city,
    place.kind,
    place.price,
    place.summary,
    place.localTip,
    place.bestFor.join(" "),
    place.vibe.join(" "),
    place.reddit.consensus,
  ]
    .join(" ")
    .toLowerCase();

  return target.includes(query.toLowerCase().trim());
}

export function getCityId(place: Place): Exclude<CityId, "all"> {
  return place.city === "NYC" ? "nyc" : "jc";
}

export function filterMatches(place: Place, price: PriceFilter, vibe: string, pulse: PulseFilter) {
  const priceOk = price === "all" || place.price === price;
  const vibeOk =
    vibe === "all" ||
    place.vibe.includes(vibe) ||
    place.bestFor.includes(vibe) ||
    place.kind.toLowerCase().includes(vibe);
  const pulseOk = pulse === "all" || place.reddit.pulse === pulse;

  return priceOk && vibeOk && pulseOk;
}

export function sortPlaces(a: Place, b: Place, sortMode: SortMode) {
  if (sortMode === "reviews") {
    return (b.userRatingsTotal ?? b.mentions) - (a.userRatingsTotal ?? a.mentions);
  }

  if (sortMode === "rating") {
    const ratingDelta = (b.rating ?? 0) - (a.rating ?? 0);
    return ratingDelta || b.signal - a.signal;
  }

  if (sortMode === "name") return a.name.localeCompare(b.name);
  return b.signal - a.signal;
}

export function isLayerPreference(value: unknown): value is LayerId | "all" {
  return value === "all" || layers.some((layer) => layer.id === value);
}

export function isCityPreference(value: unknown): value is CityId {
  return cityOptions.some((city) => city.id === value);
}

export function isPricePreference(value: unknown): value is PriceFilter {
  return priceOptions.some((option) => option.id === value);
}

export function isPulsePreference(value: unknown): value is PulseFilter {
  return pulseOptions.some((option) => option.id === value);
}

export function isSortPreference(value: unknown): value is SortMode {
  return sortOptions.some((option) => option.id === value);
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function toExportPlace(place: Place): ExportPlace {
  return {
    name: place.name,
    city: place.city,
    neighborhood: place.neighborhood,
    layer: place.layer,
    kind: place.kind,
    price: place.price,
    rating: place.rating,
    userRatingsTotal: place.userRatingsTotal,
    signal: place.signal,
    address: place.address,
    source: place.source,
    googlePlaceId: place.googlePlaceId,
    localTip: place.localTip,
  };
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function estimateNeighborhood(lat: number, lng: number, city: "NYC" | "Jersey City") {
  const candidates = neighborhoods.filter((neighborhood) => neighborhood.city === city);
  const nearest = candidates.reduce<{ name: string; distance: number }>(
    (best, neighborhood) => {
      const distance = Math.hypot(neighborhood.lat - lat, neighborhood.lng - lng);
      return distance < best.distance ? { name: neighborhood.name, distance } : best;
    },
    { name: city, distance: Number.POSITIVE_INFINITY },
  );

  return nearest.name;
}

export function priceFromGoogle(priceLevel?: number): Place["price"] {
  if (priceLevel === 0) return "Free";
  if (priceLevel === 1) return "$";
  if (priceLevel === 2) return "$$";
  return "$$$";
}

export function googleSignal(rating?: number, total?: number) {
  const ratingScore = rating ? rating * 16 : 65;
  const volumeScore = total ? Math.min(22, Math.log10(total + 1) * 8) : 0;
  return Math.max(55, Math.min(98, Math.round(ratingScore + volumeScore)));
}

export function inferLayerFromSearch(query: string, activeLayer: LayerId | "all"): LayerId {
  if (activeLayer !== "all" && activeLayer !== "reddit") return activeLayer;

  const normalized = query.toLowerCase();

  if (
    ["restaurant", "food", "ramen", "pizza", "cafe", "coffee", "bakery", "bar", "brunch"].some(
      (term) => normalized.includes(term),
    )
  ) {
    return "eat";
  }

  if (
    ["historic", "history", "landmark", "old", "museum"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "memory";
  }

  if (
    ["date", "quiet", "cocktail", "rooftop", "lounge", "vibe"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "vibe";
  }

  return "do";
}
