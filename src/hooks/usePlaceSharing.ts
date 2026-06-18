import { useCallback } from "react";
import type { CityId, LayerId, Place } from "../data/places";
import { getGoogleMapsUrl, type UserLocation } from "../lib/lifelayers";
import { buildPlaceShareUrl, buildShareText } from "../utils/placeState";

export function usePlaceSharing({
  selectedPlace,
  liveSearchQuery,
  userLocation,
  setActiveCity,
  setActionStatus,
}: {
  selectedPlace: Place;
  liveSearchQuery: string;
  userLocation: UserLocation | null;
  setActiveCity: (city: CityId) => void;
  setActionStatus: (message: string) => void;
}) {
  const getPlaceShareUrl = useCallback(
    () => buildPlaceShareUrl(selectedPlace, window.location.href),
    [selectedPlace],
  );

  const sharePlan = useCallback(async () => {
    const title = `LifeLayers: ${selectedPlace.name}`;
    const url = getPlaceShareUrl();
    const text = buildShareText(selectedPlace, liveSearchQuery, url);

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setActionStatus(`${selectedPlace.name} shared.`);
        return;
      }

      await navigator.clipboard.writeText(text);
      setActionStatus(`${selectedPlace.name} copied to clipboard.`);
    } catch {
      setActionStatus("Share was cancelled or blocked.");
    }
  }, [getPlaceShareUrl, liveSearchQuery, selectedPlace, setActionStatus]);

  const openSavedPlaceInGoogleMaps = useCallback(
    (place: Place) => {
      const openedWindow = window.open(getGoogleMapsUrl(place), "_blank", "noopener,noreferrer");
      if (openedWindow) {
        openedWindow.opener = null;
        setActionStatus(`Opening ${place.name} in Google Maps.`);
        return;
      }

      setActionStatus("Allow popups to open saved places in Google Maps.");
    },
    [setActionStatus],
  );

  const keepLocationMode = useCallback(
    (place?: Place) => {
      if (place?.city === "Near you" || userLocation) {
        setActiveCity("nearby");
        return;
      }

      setActiveCity("all");
    },
    [setActiveCity, userLocation],
  );

  const pickLayerScopedPlace = useCallback(
    (place: Place, setActiveLayer?: (layer: LayerId | "all") => void) => {
      setActiveLayer?.(place.layer);
      keepLocationMode(place);
    },
    [keepLocationMode],
  );

  return {
    sharePlan,
    openSavedPlaceInGoogleMaps,
    keepLocationMode,
    pickLayerScopedPlace,
  };
}
