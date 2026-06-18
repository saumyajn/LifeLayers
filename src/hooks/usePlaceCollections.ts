import { useMemo } from "react";
import type { Place } from "../data/places";
import { places } from "../data/places";
import type { LayerSubcategoryOption } from "../lib/lifelayers";
import {
  getActiveNeighborhoods,
  getAllPlaces,
  getAvailableVibes,
  getLayerCounts,
  getTopNeighborhoods,
  getVisiblePlaces,
  type PlaceFilterState,
} from "../utils/placeState";

export function usePlaceCollections({
  livePlaces,
  hasGoogleApiKey,
  filters,
  savedIds,
  activeSubcategory,
  compareMode,
}: {
  livePlaces: Place[];
  hasGoogleApiKey: boolean;
  filters: PlaceFilterState;
  savedIds: string[];
  activeSubcategory?: LayerSubcategoryOption;
  compareMode: boolean;
}) {
  const allPlaces = useMemo(
    () => getAllPlaces(places, livePlaces, hasGoogleApiKey),
    [hasGoogleApiKey, livePlaces],
  );

  const visiblePlaces = useMemo(
    () =>
      getVisiblePlaces({
        allPlaces,
        filters,
        savedIds,
        activeSubcategory,
      }),
    [activeSubcategory, allPlaces, filters, savedIds],
  );

  const layerCounts = useMemo(
    () =>
      getLayerCounts(
        allPlaces,
        filters.activeCity,
        filters.priceFilter,
        filters.vibeFilter,
        filters.pulseFilter,
      ),
    [allPlaces, filters.activeCity, filters.priceFilter, filters.pulseFilter, filters.vibeFilter],
  );

  const availableVibes = useMemo(
    () => getAvailableVibes(allPlaces, filters.activeCity),
    [allPlaces, filters.activeCity],
  );

  const activeNeighborhoods = useMemo(
    () => getActiveNeighborhoods(filters.activeCity),
    [filters.activeCity],
  );

  const topNeighborhoods = useMemo(
    () => getTopNeighborhoods(activeNeighborhoods, compareMode),
    [activeNeighborhoods, compareMode],
  );

  return {
    allPlaces,
    visiblePlaces,
    layerCounts,
    availableVibes,
    activeNeighborhoods,
    topNeighborhoods,
  };
}
