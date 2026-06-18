import { useEffect, useRef, useState } from "react";
import type { CityId, LayerId } from "../data/places";
import {
  isFirebaseConfigured,
  loadUserPreferences,
  saveUserPreferences,
  type LifeLayersUser,
  type UserPreferences,
} from "../firebase";
import {
  getErrorMessage,
  isLayerPreference,
  isPricePreference,
  isPulsePreference,
  isSortPreference,
  isUserLocation,
  normalizeLocationId,
  radiusOptions,
  type PriceFilter,
  type PulseFilter,
  type SortMode,
  type SubcategoryFilter,
  type UserLocation,
} from "../lib/lifelayers";

type PreferenceSetters = {
  setActiveLayer: (layer: LayerId | "all") => void;
  setActiveCity: (city: CityId) => void;
  setPriceFilter: (price: PriceFilter) => void;
  setVibeFilter: (vibe: string) => void;
  setSubcategoryFilter: (subcategory: SubcategoryFilter) => void;
  setPulseFilter: (pulse: PulseFilter) => void;
  setSortMode: (sortMode: SortMode) => void;
  setSavedOnly: (savedOnly: boolean) => void;
  setSavedIds: (ids: string[]) => void;
  setLiveSearchQuery: (query: string) => void;
  setLiveSearchDraft: (query: string) => void;
  setSearchRadiusMiles: (radius: number) => void;
  setSavedLocations: (locations: UserLocation[]) => void;
  setUserLocation: (location: UserLocation | null) => void;
  setLocationStatus: (message: string) => void;
};

export function useUserPreferences({
  authReady,
  currentUser,
  preferences,
  setters,
  requestBrowserLocation,
  setActionStatus,
}: {
  authReady: boolean;
  currentUser: LifeLayersUser | null;
  preferences: UserPreferences;
  setters: PreferenceSetters;
  requestBrowserLocation: () => void;
  setActionStatus: (message: string) => void;
}) {
  const [preferencesReady, setPreferencesReady] = useState(!isFirebaseConfigured);
  const restoredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady) return;

    if (!currentUser) {
      restoredUserRef.current = null;
      setPreferencesReady(!isFirebaseConfigured);
      requestBrowserLocation();
      return;
    }

    if (restoredUserRef.current === currentUser.uid) {
      setPreferencesReady(true);
      return;
    }

    setPreferencesReady(false);

    loadUserPreferences(currentUser.uid)
      .then((storedPreferences) => {
        if (!storedPreferences) {
          requestBrowserLocation();
          return;
        }

        restorePreferences(storedPreferences, setters, requestBrowserLocation);
        setActionStatus("Your saved LifeLayers setup is loaded.");
      })
      .catch((error) => setActionStatus(getErrorMessage(error)))
      .finally(() => {
        restoredUserRef.current = currentUser.uid;
        setPreferencesReady(true);
      });
  }, [authReady, currentUser, requestBrowserLocation, setActionStatus, setters]);

  useEffect(() => {
    if (!currentUser || !preferencesReady || !isFirebaseConfigured) return;

    const timeoutId = window.setTimeout(() => {
      saveUserPreferences(currentUser, preferences).catch((error) =>
        setActionStatus(getErrorMessage(error)),
      );
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [currentUser, preferences, preferencesReady, setActionStatus]);

  return {
    preferencesReady,
  };
}

function restorePreferences(
  storedPreferences: Partial<UserPreferences>,
  setters: PreferenceSetters,
  requestBrowserLocation: () => void,
) {
  if (isLayerPreference(storedPreferences.activeLayer)) {
    setters.setActiveLayer(storedPreferences.activeLayer);
  }
  if (storedPreferences.activeCity === "nearby") {
    setters.setActiveCity("nearby");
  }
  if (isPricePreference(storedPreferences.priceFilter)) {
    setters.setPriceFilter(storedPreferences.priceFilter);
  }
  if (typeof storedPreferences.vibeFilter === "string") {
    setters.setVibeFilter(storedPreferences.vibeFilter);
  }
  if (typeof storedPreferences.subcategoryFilter === "string") {
    setters.setSubcategoryFilter(storedPreferences.subcategoryFilter);
  }
  if (isPulsePreference(storedPreferences.pulseFilter)) {
    setters.setPulseFilter(storedPreferences.pulseFilter);
  }
  if (isSortPreference(storedPreferences.sortMode)) {
    setters.setSortMode(storedPreferences.sortMode);
  }
  if (typeof storedPreferences.savedOnly === "boolean") {
    setters.setSavedOnly(storedPreferences.savedOnly);
  }
  if (Array.isArray(storedPreferences.savedIds)) {
    setters.setSavedIds(storedPreferences.savedIds.filter((id) => typeof id === "string"));
  }
  if (typeof storedPreferences.liveSearchQuery === "string") {
    setters.setLiveSearchQuery(storedPreferences.liveSearchQuery);
    setters.setLiveSearchDraft(storedPreferences.liveSearchQuery);
  }
  if (
    typeof storedPreferences.searchRadiusMiles === "number" &&
    radiusOptions.some((option) => option === storedPreferences.searchRadiusMiles)
  ) {
    setters.setSearchRadiusMiles(storedPreferences.searchRadiusMiles);
  }

  const restoredSavedLocations = Array.isArray(storedPreferences.savedLocations)
    ? storedPreferences.savedLocations.filter(isUserLocation).map((location) => ({
        ...location,
        id: location.id ?? normalizeLocationId(location),
        source: "saved" as const,
        radiusMiles: location.radiusMiles ?? storedPreferences.searchRadiusMiles ?? 25,
      }))
    : [];

  if (restoredSavedLocations.length) {
    setters.setSavedLocations(restoredSavedLocations);
  }

  if (isUserLocation(storedPreferences.userLocation)) {
    const activeLocation: UserLocation = {
      ...storedPreferences.userLocation,
      id: storedPreferences.userLocation.id ?? normalizeLocationId(storedPreferences.userLocation),
      source:
        storedPreferences.userLocation.source === "browser"
          ? "browser"
          : restoredSavedLocations.some(
                (location) =>
                  location.id ===
                  (storedPreferences.userLocation?.id ??
                    normalizeLocationId(storedPreferences.userLocation as UserLocation)),
              )
            ? "saved"
            : storedPreferences.userLocation.source,
    };

    setters.setUserLocation({
      ...activeLocation,
      label: activeLocation.label || "Saved location",
    });
    setters.setSearchRadiusMiles(
      activeLocation.radiusMiles ?? storedPreferences.searchRadiusMiles ?? 25,
    );
    setters.setActiveCity("nearby");
    setters.setLocationStatus(
      activeLocation.source === "saved" ? "Using your saved city." : "Using your saved location.",
    );
  } else if (restoredSavedLocations[0]) {
    setters.setUserLocation(restoredSavedLocations[0]);
    setters.setSearchRadiusMiles(
      restoredSavedLocations[0].radiusMiles ?? storedPreferences.searchRadiusMiles ?? 25,
    );
    setters.setActiveCity("nearby");
    setters.setLocationStatus("Using your saved city.");
  } else {
    requestBrowserLocation();
  }
}
