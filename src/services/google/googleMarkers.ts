import type { LayerId, Place } from "../../data/places";
import { layers } from "../../data/places";
import { layerColor } from "../../lib/lifelayers";
import { getGoogleMaps, importGoogleLibrary, logGoogleDevError } from "./googleMapsLoader";
import type { GoogleMapLike, GoogleMarkerLibrary, ManagedGoogleMarker } from "./googlePlaceTypes";

export async function createGooglePlaceMarkers({
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
  const markerLibrary = await importGoogleLibrary<GoogleMarkerLibrary>("marker").catch((error) => {
    logGoogleDevError("Google marker library import failed; trying legacy Marker fallback.", error);
    return undefined;
  });
  const AdvancedMarkerElement = markerLibrary?.AdvancedMarkerElement;

  if (AdvancedMarkerElement) {
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

  return createLegacyPlaceMarkers({ map, places, selectedPlaceId, onPickPlace });
}

export function clearGooglePlaceMarkers(markers: ManagedGoogleMarker[]) {
  markers.forEach(({ marker, listeners }) => {
    listeners.forEach((listener) => listener.remove());
    if ("setMap" in marker) {
      marker.setMap(null);
      return;
    }

    marker.map = null;
  });
}

function createLegacyPlaceMarkers({
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
  const google = getGoogleMaps();
  const Marker = (
    google.maps as
      | {
          Marker?: new (options: {
            map: GoogleMapLike;
            position: { lat: number; lng: number };
            title?: string;
            label?: {
              text: string;
              color: string;
              fontWeight: string;
            };
            icon?: Record<string, unknown>;
          }) => {
            setMap: (map: GoogleMapLike | null) => void;
            addListener?: (eventName: string, handler: () => void) => { remove: () => void };
          };
          SymbolPath?: { CIRCLE?: unknown };
        }
      | undefined
  )?.Marker;
  const symbolPath = (google.maps as { SymbolPath?: { CIRCLE?: unknown } } | undefined)?.SymbolPath;

  if (!Marker) {
    throw new Error("Google Maps marker library is unavailable.");
  }

  return places.map((place) => {
    const marker = new Marker({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
      label: {
        text: layers.find((layer) => layer.id === place.layer)?.symbol ?? "P",
        color: "#ffffff",
        fontWeight: "900",
      },
      icon: {
        path: symbolPath?.CIRCLE,
        fillColor: layerColor[place.layer],
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: place.id === selectedPlaceId ? 13 : 10,
      },
    });
    const listener = marker.addListener?.("click", () => onPickPlace(place));

    return {
      marker,
      listeners: listener ? [listener] : [],
    };
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
