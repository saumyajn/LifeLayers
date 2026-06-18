import { useEffect, useRef, useState } from "react";
import type { CityId, LayerId } from "../data/places";
import type { LifeLayersUser } from "../features/auth/authTypes";
import {
  loadUserPreferences,
  saveUserPreferences,
} from "../features/preferences/preferencesService";
import type { UserPreferences } from "../features/preferences/preferencesTypes";
import {
  type PriceFilter,
  type PulseFilter,
  type SortMode,
  type SubcategoryFilter,
  type UserLocation,
} from "../lib/lifelayers";
import { isFirebaseConfigured } from "../services/firebase/firebaseApp";

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
      .then((result) => {
        if (!result.ok) {
          setActionStatus(result.message);
          requestBrowserLocation();
          return;
        }

        if (!result.preferences) {
          requestBrowserLocation();
          return;
        }

        restorePreferences(result.preferences, setters, requestBrowserLocation);
        setActionStatus("Your saved LifeLayers setup is loaded.");
      })
      .finally(() => {
        restoredUserRef.current = currentUser.uid;
        setPreferencesReady(true);
      });
  }, [authReady, currentUser, requestBrowserLocation, setActionStatus, setters]);

  useEffect(() => {
    if (!currentUser || !preferencesReady || !isFirebaseConfigured) return;

    const timeoutId = window.setTimeout(() => {
      saveUserPreferences(currentUser, preferences).then((result) => {
        if (!result.ok) setActionStatus(result.message);
      });
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
  if (storedPreferences.activeLayer) setters.setActiveLayer(storedPreferences.activeLayer);
  if (storedPreferences.activeCity) setters.setActiveCity(storedPreferences.activeCity);
  if (storedPreferences.priceFilter) setters.setPriceFilter(storedPreferences.priceFilter);
  if (storedPreferences.vibeFilter) setters.setVibeFilter(storedPreferences.vibeFilter);
  if (storedPreferences.subcategoryFilter) {
    setters.setSubcategoryFilter(storedPreferences.subcategoryFilter);
  }
  if (storedPreferences.pulseFilter) setters.setPulseFilter(storedPreferences.pulseFilter);
  if (storedPreferences.sortMode) setters.setSortMode(storedPreferences.sortMode);
  if (typeof storedPreferences.savedOnly === "boolean")
    setters.setSavedOnly(storedPreferences.savedOnly);
  if (storedPreferences.savedIds) setters.setSavedIds(storedPreferences.savedIds);
  if (storedPreferences.liveSearchQuery) {
    setters.setLiveSearchQuery(storedPreferences.liveSearchQuery);
    setters.setLiveSearchDraft(storedPreferences.liveSearchQuery);
  }
  if (storedPreferences.searchRadiusMiles) {
    setters.setSearchRadiusMiles(storedPreferences.searchRadiusMiles);
  }

  const restoredSavedLocations = storedPreferences.savedLocations ?? [];

  if (restoredSavedLocations.length) {
    setters.setSavedLocations(restoredSavedLocations);
  }

  if (storedPreferences.userLocation) {
    const activeLocation = storedPreferences.userLocation;

    setters.setUserLocation(activeLocation);
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
