import type { CityId, LayerId, Neighborhood, Place } from "../data/places";
import { layers, neighborhoods } from "../data/places";
import type { UserPreferences } from "../features/preferences/preferencesTypes";
import {
  cityMatches,
  csvEscape,
  filterMatches,
  layerSubcategoryOptions,
  layerMatches,
  planPresets,
  sortPlaces,
  subcategoryMatches,
  textMatches,
  toExportPlace,
  type LayerSubcategoryOption,
  type LiveStatus,
  type PriceFilter,
  type PulseFilter,
  type SortMode,
  type SubcategoryFilter,
  type UserLocation,
} from "../lib/lifelayers";

export type PlaceFilterState = {
  activeCity: CityId;
  activeLayer: LayerId | "all";
  priceFilter: PriceFilter;
  vibeFilter: string;
  pulseFilter: PulseFilter;
  subcategoryFilter: SubcategoryFilter;
  sortMode: SortMode;
  savedOnly: boolean;
  query: string;
  liveSearchQuery: string;
};

export type ActiveFilterSummary = PlaceFilterState & {
  userLocation: UserLocation | null;
  searchRadiusMiles: number;
  activeSubcategory?: LayerSubcategoryOption;
};

export type ExportPayloadInput = PlaceFilterState & {
  title: string;
  source: LiveStatus["source"];
  places: Place[];
};

export function getAllPlaces(basePlaces: Place[], livePlaces: Place[], hasGoogleApiKey: boolean) {
  if (!hasGoogleApiKey || livePlaces.length === 0) return basePlaces;
  return [...basePlaces, ...livePlaces];
}

export function getVisiblePlaces({
  allPlaces,
  filters,
  savedIds,
  activeSubcategory,
}: {
  allPlaces: Place[];
  filters: PlaceFilterState;
  savedIds: string[];
  activeSubcategory?: LayerSubcategoryOption;
}) {
  return allPlaces
    .filter(
      (place) =>
        cityMatches(place, filters.activeCity) &&
        layerMatches(place, filters.activeLayer) &&
        filterMatches(place, filters.priceFilter, filters.vibeFilter, filters.pulseFilter) &&
        subcategoryMatches(place, activeSubcategory) &&
        (!filters.savedOnly || savedIds.includes(place.id)) &&
        (!filters.query || textMatches(place, filters.query)),
    )
    .sort((a, b) => sortPlaces(a, b, filters.sortMode));
}

export function getLayerCounts(
  allPlaces: Place[],
  activeCity: CityId,
  priceFilter: PriceFilter,
  vibeFilter: string,
  pulseFilter: PulseFilter,
) {
  const counts: Record<LayerId, number> = {
    eat: 0,
    do: 0,
    reddit: 0,
    memory: 0,
    vibe: 0,
  };

  allPlaces.forEach((place) => {
    if (
      cityMatches(place, activeCity) &&
      filterMatches(place, priceFilter, vibeFilter, pulseFilter)
    ) {
      counts[place.layer] += 1;
    }
  });

  return counts;
}

export function getAvailableVibes(allPlaces: Place[], activeCity: CityId) {
  const vibeSet = new Set<string>();
  allPlaces
    .filter((place) => cityMatches(place, activeCity))
    .forEach((place) => {
      place.vibe.forEach((vibe) => vibeSet.add(vibe));
      place.bestFor.forEach((tag) => vibeSet.add(tag));
    });

  return ["all", ...Array.from(vibeSet).sort()].slice(0, 28);
}

export function getActiveNeighborhoods(activeCity: CityId) {
  return neighborhoods.filter((neighborhood) => {
    if (activeCity === "all") return true;
    if (activeCity === "nearby") return false;
    return activeCity === "nyc" ? neighborhood.city === "NYC" : neighborhood.city === "Jersey City";
  });
}

export function getTopNeighborhoods(activeNeighborhoods: Neighborhood[], compareMode: boolean) {
  return [...activeNeighborhoods].sort((a, b) => b.score - a.score).slice(0, compareMode ? 4 : 3);
}

export function getSelectedPlace(allPlaces: Place[], visiblePlaces: Place[], selectedId: string) {
  return allPlaces.find((place) => place.id === selectedId) ?? visiblePlaces[0] ?? allPlaces[0];
}

export function getSavedPlaces(allPlaces: Place[], savedIds: string[]) {
  return savedIds
    .map((id) => allPlaces.find((place) => place.id === id))
    .filter((place): place is Place => Boolean(place));
}

export function getExportPlaces(savedPlaces: Place[], visiblePlaces: Place[]) {
  return savedPlaces.length ? savedPlaces : visiblePlaces;
}

export function toggleSavedId(savedIds: string[], placeId: string) {
  return savedIds.includes(placeId)
    ? savedIds.filter((id) => id !== placeId)
    : [...savedIds, placeId];
}

export function getSubcategoryOptions(activeLayer: LayerId | "all") {
  return activeLayer === "all" ? [] : (layerSubcategoryOptions[activeLayer] ?? []);
}

export function getActivePresetLabel(filters: PlaceFilterState) {
  const matchingPreset = planPresets.find(
    (preset) =>
      preset.query === filters.query &&
      preset.layer === filters.activeLayer &&
      preset.price === filters.priceFilter &&
      filters.pulseFilter === "all" &&
      filters.vibeFilter === "all" &&
      filters.subcategoryFilter === "all" &&
      !filters.savedOnly &&
      !filters.liveSearchQuery,
  );

  return matchingPreset?.label;
}

export function getActiveFilterCount(summary: ActiveFilterSummary) {
  let count = 0;

  if (summary.activeCity !== "all") count += 1;
  if (summary.activeCity !== "all") count += 1;
  if (summary.activeLayer !== "all") count += 1;
  if (summary.priceFilter !== "all") count += 1;
  if (summary.activeSubcategory) count += 1;
  if (summary.vibeFilter !== "all") count += 1;
  if (summary.pulseFilter !== "all") count += 1;
  if (summary.query) count += 1;
  if (summary.liveSearchQuery) count += 1;
  if (summary.savedOnly) count += 1;
  if (summary.sortMode !== "signal") count += 1;

  return count;
}

export function getFilterSignature(summary: ActiveFilterSummary) {
  return [
    summary.activeCity,
    summary.activeLayer,
    summary.priceFilter,
    summary.subcategoryFilter,
    summary.vibeFilter,
    summary.pulseFilter,
    summary.sortMode,
    summary.savedOnly ? "saved" : "all",
    summary.query,
    summary.liveSearchQuery,
    summary.userLocation?.lat,
    summary.userLocation?.lng,
    summary.searchRadiusMiles,
  ].join("|");
}

export function getPlanTitle({
  activeCity,
  userLocation,
  activeLayer,
}: {
  activeCity: CityId;
  userLocation: UserLocation | null;
  activeLayer: LayerId | "all";
}) {
  const cityLabel =
    activeCity === "nearby" && userLocation ? userLocation.label : "Current location";
  const layerLabel =
    activeLayer === "all"
      ? "all layers"
      : (layers.find((layer) => layer.id === activeLayer)?.label.toLowerCase() ?? activeLayer);

  return `LifeLayers ${cityLabel} ${layerLabel} plan`;
}

export function buildPlaceShareUrl(place: Place, currentHref: string) {
  const url = new URL(currentHref);
  url.searchParams.set("place", place.id);
  return url.toString();
}

export function buildShareText(place: Place, liveSearchQuery: string, shareUrl: string) {
  const score = place.rating
    ? `${place.rating.toFixed(1)} Google rating`
    : `${place.signal}/100 LifeLayers signal`;

  return [
    `LifeLayers: ${place.name}`,
    liveSearchQuery ? `Search: ${liveSearchQuery}` : null,
    `${place.kind} - ${place.price} - ${place.neighborhood}, ${place.city}`,
    score,
    place.address,
    place.summary,
    `Local tip: ${place.localTip}`,
    shareUrl,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildJsonExportPayload(input: ExportPayloadInput) {
  return {
    exportedAt: new Date().toISOString(),
    title: input.title,
    filters: {
      city: input.activeCity,
      layer: input.activeLayer,
      price: input.priceFilter,
      vibe: input.vibeFilter,
      pulse: input.pulseFilter,
      subcategory: input.subcategoryFilter,
      sort: input.sortMode,
      savedOnly: input.savedOnly,
      query: input.query,
      liveSearchQuery: input.liveSearchQuery,
    },
    source: input.source,
    places: input.places.map(toExportPlace),
  };
}

export function buildCsvExportContent(places: Place[]) {
  const headers = [
    "Name",
    "City",
    "Neighborhood",
    "Layer",
    "Kind",
    "Price",
    "Rating",
    "Reviews",
    "Signal",
    "Source",
    "Address",
    "Local Tip",
  ];

  const rows = places.map((place) =>
    [
      place.name,
      place.city,
      place.neighborhood,
      place.layer,
      place.kind,
      place.price,
      place.rating,
      place.userRatingsTotal,
      place.signal,
      place.source,
      place.address,
      place.localTip,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.map(csvEscape).join(","), ...rows].join("\n");
}

export function buildUserPreferences({
  filters,
  savedIds,
  userLocation,
  savedLocations,
  searchRadiusMiles,
}: {
  filters: PlaceFilterState;
  savedIds: string[];
  userLocation: UserLocation | null;
  savedLocations: UserLocation[];
  searchRadiusMiles: number;
}): UserPreferences {
  return {
    activeLayer: filters.activeLayer,
    activeCity: filters.activeCity,
    priceFilter: filters.priceFilter,
    vibeFilter: filters.vibeFilter,
    subcategoryFilter: filters.subcategoryFilter,
    pulseFilter: filters.pulseFilter,
    sortMode: filters.sortMode,
    savedOnly: filters.savedOnly,
    savedIds,
    liveSearchQuery: filters.liveSearchQuery,
    userLocation,
    savedLocations,
    searchRadiusMiles,
  };
}
