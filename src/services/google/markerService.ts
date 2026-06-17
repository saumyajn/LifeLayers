import type { LayerId, Place } from "../../data/places";
import { layers } from "../../data/places";
import { layerColor } from "../../lib/lifelayers";
import { importGoogleLibrary } from "./googleMapsLoader";
import type { GoogleMapLike, GoogleMarkerLibrary, ManagedGoogleMarker } from "./placeTypes";

export async function createAdvancedPlaceMarkers({
  map,
  places,
  selectedPlaceId,
  onPickPlace,
}: {
  map: GoogleMapLike;
  places: Place[];
  selectedPlaceId: string;
  onPickPlace: (place: Place) => void;
}) {
  const markerLibrary = await importGoogleLibrary<GoogleMarkerLibrary>("marker");
  const AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;

  if (!AdvancedMarkerElement) {
    throw new Error("Google Maps marker library is unavailable.");
  }

  return places.map((place) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
      content: createMarkerContent(place, place.id === selectedPlaceId),
    });
    const listener = marker.addListener?.("click", () => onPickPlace(place));

    return {
      marker,
      listeners: listener ? [listener] : [],
    };
  });
}

export function clearAdvancedPlaceMarkers(markers: ManagedGoogleMarker[]) {
  markers.forEach(({ marker, listeners }) => {
    listeners.forEach((listener) => listener.remove());
    marker.map = null;
  });
}

function createMarkerContent(place: Place, selected: boolean) {
  const content = document.createElement("button");
  const layer = layers.find((item) => item.id === place.layer);
  const color = layerColor[place.layer as LayerId];
  const scale = selected ? 1.26 : 1;

  content.type = "button";
  content.className = selected ? "advanced-map-marker selected" : "advanced-map-marker";
  content.setAttribute("aria-label", place.name);
  content.style.setProperty("--marker-color", color);
  content.style.setProperty("--marker-scale", String(scale));
  content.textContent = layer?.symbol ?? "P";

  return content;
}
