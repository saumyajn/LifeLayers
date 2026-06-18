import { useEffect, useState } from "react";
import type { Place } from "../data/places";
import { places } from "../data/places";
import { getSelectedPlace } from "../utils/placeState";

export function useSelectedPlace(allPlaces: Place[], visiblePlaces: Place[]) {
  const [selectedId, setSelectedId] = useState(places[0].id);
  const selectedPlace = getSelectedPlace(allPlaces, visiblePlaces, selectedId);

  useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get("place");
    if (!placeId || selectedId === placeId) return;
    if (allPlaces.some((place) => place.id === placeId)) {
      setSelectedId(placeId);
    }
  }, [allPlaces, selectedId]);

  useEffect(() => {
    if (visiblePlaces.length && !visiblePlaces.some((place) => place.id === selectedId)) {
      setSelectedId(visiblePlaces[0].id);
    }
  }, [selectedId, visiblePlaces]);

  return {
    selectedId,
    selectedPlace,
    setSelectedId,
  };
}
