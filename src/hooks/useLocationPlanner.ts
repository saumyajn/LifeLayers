import { useCallback, useRef, useState } from "react";
import type { CityId } from "../data/places";
import {
  getErrorMessage,
  normalizeLocationId,
  radiusOptions,
  type UserLocation,
} from "../lib/lifelayers";
import { geocodeAddress } from "../services/google/googleMapsLoader";

export function useLocationPlanner({
  googleApiKey,
  setActionStatus,
  setActiveCity,
}: {
  googleApiKey?: string;
  setActionStatus: (message: string) => void;
  setActiveCity: (city: CityId) => void;
}) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([]);
  const [locationDraft, setLocationDraft] = useState("");
  const [findingLocation, setFindingLocation] = useState(false);
  const [searchRadiusMiles, setSearchRadiusMiles] = useState<number>(25);
  const [locationStatus, setLocationStatus] = useState("Finding your location...");
  const geolocationAttemptedRef = useRef(false);

  const requestBrowserLocation = useCallback(
    (manual = false, precise = true) => {
      if (!("geolocation" in navigator)) {
        setLocationStatus("Location is not supported in this browser.");
        if (manual) setActionStatus("This browser does not support location sharing.");
        return;
      }

      if (!manual && geolocationAttemptedRef.current) return;

      geolocationAttemptedRef.current = true;
      setLocationStatus("Requesting your location...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation: UserLocation = {
            id: "current-location",
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: "Current location",
            source: "browser",
            radiusMiles: searchRadiusMiles,
            updatedAt: new Date().toISOString(),
          };

          setUserLocation(nextLocation);
          setActiveCity("nearby");
          setLocationStatus("Using your current location.");
          setActionStatus("LifeLayers is searching near your location.");
        },
        () => {
          setLocationStatus("Location blocked. Showing fallback places.");
          setActiveCity("all");
          if (manual) setActionStatus("Location permission was blocked.");
        },
        {
          enableHighAccuracy: precise,
          maximumAge: precise ? 0 : 10 * 60 * 1000,
          timeout: precise ? 12000 : 8000,
        },
      );
    },
    [searchRadiusMiles, setActionStatus, setActiveCity],
  );

  const findCityLocation = useCallback(async () => {
    const search = locationDraft.trim();
    if (!search) {
      setActionStatus("Enter a city to preview.");
      return;
    }

    if (!googleApiKey) {
      setActionStatus("Add VITE_GOOGLE_MAPS_API_KEY to search and save cities.");
      return;
    }

    setFindingLocation(true);
    setLocationStatus(`Finding ${search}...`);

    try {
      const { lat, lng, label } = await geocodeAddress(googleApiKey, search);
      const nextLocation: UserLocation = {
        id: normalizeLocationId({ label, lat, lng }),
        lat,
        lng,
        label,
        source: "search",
        radiusMiles: searchRadiusMiles,
        updatedAt: new Date().toISOString(),
      };

      setUserLocation(nextLocation);
      setActiveCity("nearby");
      setLocationStatus(`Previewing ${label}.`);
      setActionStatus(`Previewing places in ${label}. Save it to keep this city.`);
    } catch (error) {
      setLocationStatus("City search failed.");
      setActionStatus(getErrorMessage(error));
    } finally {
      setFindingLocation(false);
    }
  }, [googleApiKey, locationDraft, searchRadiusMiles, setActionStatus, setActiveCity]);

  const saveActiveLocation = useCallback(() => {
    if (!userLocation) {
      setActionStatus("Find a city or use your location before saving.");
      return;
    }

    const savedLocation: UserLocation = {
      ...userLocation,
      id: userLocation.id ?? normalizeLocationId(userLocation),
      source: "saved",
      radiusMiles: searchRadiusMiles,
      updatedAt: new Date().toISOString(),
    };

    setSavedLocations((current) => {
      const withoutDuplicate = current.filter((location) => location.id !== savedLocation.id);
      return [...withoutDuplicate, savedLocation].sort((a, b) => a.label.localeCompare(b.label));
    });
    setUserLocation(savedLocation);
    setActiveCity("nearby");
    setLocationStatus(`Saved ${savedLocation.label}.`);
    setActionStatus(`${savedLocation.label} saved for future planning.`);
  }, [searchRadiusMiles, setActionStatus, setActiveCity, userLocation]);

  const selectSavedLocation = useCallback(
    (locationId: string) => {
      const nextLocation = savedLocations.find((location) => location.id === locationId);
      if (!nextLocation) return;

      setUserLocation(nextLocation);
      setSearchRadiusMiles(nextLocation.radiusMiles ?? searchRadiusMiles);
      setActiveCity("nearby");
      setLocationDraft("");
      setLocationStatus(`Using saved city ${nextLocation.label}.`);
      setActionStatus(`Showing places in ${nextLocation.label}.`);
    },
    [savedLocations, searchRadiusMiles, setActionStatus, setActiveCity],
  );

  const handleMapViewportChange = useCallback(
    (center: { lat: number; lng: number }, radiusMiles: number, zoom: number) => {
      const nextRadius = radiusOptions.reduce((closest, option) =>
        Math.abs(option - radiusMiles) < Math.abs(closest - radiusMiles) ? option : closest,
      );
      const nextLocation: UserLocation = {
        id: `map-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}-${zoom}`,
        lat: center.lat,
        lng: center.lng,
        label: "Map area",
        source: "map",
        radiusMiles: nextRadius,
        updatedAt: new Date().toISOString(),
      };

      setUserLocation(nextLocation);
      setSearchRadiusMiles(nextRadius);
      setActiveCity("nearby");
      setLocationStatus(`Showing places in this map area within ${nextRadius} miles.`);
    },
    [setActiveCity],
  );

  return {
    userLocation,
    setUserLocation,
    savedLocations,
    setSavedLocations,
    locationDraft,
    setLocationDraft,
    findingLocation,
    searchRadiusMiles,
    setSearchRadiusMiles,
    locationStatus,
    setLocationStatus,
    requestBrowserLocation,
    findCityLocation,
    saveActiveLocation,
    selectSavedLocation,
    handleMapViewportChange,
  };
}
