import {
  isCityPreference,
  isLayerPreference,
  isPricePreference,
  isPulsePreference,
  isSortPreference,
  isUserLocation,
  normalizeLocationId,
  radiusOptions,
  type UserLocationSource,
  type UserLocation,
} from "../../lib/lifelayers";
import type { UserPreferences } from "./preferencesTypes";

export function validateRemotePreferences(value: unknown): Partial<UserPreferences> | undefined {
  if (!value || typeof value !== "object") return undefined;

  const input = value as Record<string, unknown>;
  const preferences: Partial<UserPreferences> = {};

  if (isLayerPreference(input.activeLayer)) preferences.activeLayer = input.activeLayer;
  if (isCityPreference(input.activeCity)) preferences.activeCity = input.activeCity;
  if (isPricePreference(input.priceFilter)) preferences.priceFilter = input.priceFilter;
  if (typeof input.vibeFilter === "string") preferences.vibeFilter = input.vibeFilter;
  if (typeof input.subcategoryFilter === "string") {
    preferences.subcategoryFilter = input.subcategoryFilter;
  }
  if (isPulsePreference(input.pulseFilter)) preferences.pulseFilter = input.pulseFilter;
  if (isSortPreference(input.sortMode)) preferences.sortMode = input.sortMode;
  if (typeof input.savedOnly === "boolean") preferences.savedOnly = input.savedOnly;
  if (Array.isArray(input.savedIds)) {
    preferences.savedIds = input.savedIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200,
    );
  }
  if (typeof input.liveSearchQuery === "string") {
    preferences.liveSearchQuery = input.liveSearchQuery;
  }
  if (isValidRadius(input.searchRadiusMiles)) {
    preferences.searchRadiusMiles = input.searchRadiusMiles;
  }

  const savedLocations = normalizeSavedLocations(input.savedLocations, input.searchRadiusMiles);
  if (savedLocations.length) preferences.savedLocations = savedLocations;
  if (isUserLocation(input.userLocation)) {
    preferences.userLocation = normalizeUserLocation(input.userLocation, savedLocations);
  } else if (input.userLocation === null) {
    preferences.userLocation = null;
  }

  return Object.keys(preferences).length ? preferences : undefined;
}

export function isValidRadius(value: unknown): value is number {
  return typeof value === "number" && radiusOptions.some((option) => option === value);
}

function normalizeSavedLocations(value: unknown, fallbackRadius: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(isUserLocation).map((location) => ({
    ...location,
    id: location.id ?? normalizeLocationId(location),
    source: "saved" as const,
    radiusMiles: isValidRadius(location.radiusMiles)
      ? location.radiusMiles
      : isValidRadius(fallbackRadius)
        ? fallbackRadius
        : 25,
  }));
}

function normalizeUserLocation(location: UserLocation, savedLocations: UserLocation[]) {
  const locationId = location.id ?? normalizeLocationId(location);
  const isSavedLocation = savedLocations.some((savedLocation) => savedLocation.id === locationId);
  const source: UserLocationSource =
    location.source === "browser" ? "browser" : isSavedLocation ? "saved" : location.source;

  return {
    ...location,
    id: locationId,
    label: location.label || "Saved location",
    source,
  };
}
