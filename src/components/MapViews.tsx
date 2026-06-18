import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CityId, LayerId, Neighborhood, Place } from "../data/places";
import { layers } from "../data/places";
import {
  clampZoom,
  getErrorMessage,
  layerColor,
  lngLatToWorld,
  mapPresetForCity,
  mapPresets,
  radiusMilesToMeters,
  tileSize,
  type LiveStatus,
  type UserLocation,
} from "../lib/lifelayers";
import { getGoogleMaps, loadGoogleMapsSafely } from "../services/google/googleMapsLoader";
import {
  clearGooglePlaceMarkers,
  createGooglePlaceMarkers,
} from "../services/google/googleMarkers";
import { searchGooglePlaces } from "../services/google/googlePlacesService";
import type { GoogleMapLike, ManagedGoogleMarker } from "../services/google/googlePlaceTypes";
import { readLatLng } from "../services/google/googlePlaceTypes";
export function RealMap({
  activeCity,
  neighborhoods,
  places: visiblePlaces,
  selectedPlace,
  onPickNeighborhood,
  onPickPlace,
  userLocation,
  searchRadiusMiles,
}: {
  activeCity: CityId;
  neighborhoods: Neighborhood[];
  places: Place[];
  selectedPlace: Place;
  onPickNeighborhood: (neighborhood: Neighborhood) => void;
  onPickPlace: (place: Place) => void;
  userLocation?: UserLocation | null;
  searchRadiusMiles: number;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [zoom, setZoom] = useState(mapPresets.all.zoom);
  const [center, setCenter] = useState({ lat: mapPresets.all.lat, lng: mapPresets.all.lng });

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(360, rect.height),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preset = mapPresetForCity(activeCity, userLocation);
    setZoom(preset.zoom);
    setCenter({ lat: preset.lat, lng: preset.lng });
  }, [activeCity, userLocation]);

  const centerWorld = lngLatToWorld(center.lng, center.lat, zoom);
  const left = centerWorld.x - size.width / 2;
  const top = centerWorld.y - size.height / 2;
  const minTileX = Math.floor(left / tileSize) - 1;
  const maxTileX = Math.floor((left + size.width) / tileSize) + 1;
  const minTileY = Math.floor(top / tileSize) - 1;
  const maxTileY = Math.floor((top + size.height) / tileSize) + 1;
  const tileCount = 2 ** zoom;
  const tiles = [];

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      if (y < 0 || y >= tileCount) continue;

      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        x,
        y,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * tileSize - left,
        top: y * tileSize - top,
      });
    }
  }

  const project = (lng: number, lat: number) => {
    const point = lngLatToWorld(lng, lat, zoom);
    return {
      left: point.x - left,
      top: point.y - top,
    };
  };

  const resetMap = () => {
    const preset = mapPresetForCity(activeCity, userLocation);
    setCenter({ lat: preset.lat, lng: preset.lng });
    setZoom(preset.zoom);
  };

  return (
    <div className="city-map real-map" ref={mapRef}>
      <div className="tile-pane" aria-hidden="true">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className="map-tile"
            src={tile.src}
            alt=""
            draggable={false}
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>

      <div className="map-vignette" aria-hidden="true" />

      {neighborhoods.map((neighborhood) => {
        const position = project(neighborhood.lng, neighborhood.lat);
        return (
          <button
            key={neighborhood.id}
            className="neighborhood-chip"
            style={
              {
                left: position.left,
                top: position.top,
              } as CSSProperties
            }
            onClick={() => onPickNeighborhood(neighborhood)}
          >
            {neighborhood.name}
          </button>
        );
      })}

      {visiblePlaces.map((place) => {
        const position = project(place.lng, place.lat);
        const isSelected = selectedPlace.id === place.id;

        return (
          <button
            key={place.id}
            className={`map-pin ${isSelected ? "selected" : ""}`}
            style={
              {
                left: position.left,
                top: position.top,
                "--pin-color": layerColor[place.layer],
                "--pin-scale": 0.84 + place.signal / 230,
              } as CSSProperties
            }
            onClick={() => onPickPlace(place)}
            aria-label={place.name}
          >
            <span>{layers.find((layer) => layer.id === place.layer)?.symbol}</span>
            {activeCity === "all" && <em>{place.neighborhood}</em>}
          </button>
        );
      })}

      <div className="map-controls" aria-label="Map controls">
        <button onClick={() => setZoom((current) => clampZoom(current + 1))}>+</button>
        <button onClick={() => setZoom((current) => clampZoom(current - 1))}>-</button>
        <button onClick={resetMap}>Reset</button>
      </div>

      <div className="map-scale" aria-hidden="true">
        <span />
        <small>
          {activeCity === "nearby"
            ? `real local basemap - ${searchRadiusMiles} mi`
            : "real NYC / JC basemap"}
        </small>
      </div>

      <a
        className="map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        OpenStreetMap
      </a>
    </div>
  );
}

export function GoogleLiveMap({
  apiKey,
  mapId,
  activeCity,
  activeLayer,
  liveSearchQuery,
  places: visiblePlaces,
  selectedPlace,
  userLocation,
  searchRadiusMiles,
  onViewportChange,
  onPickPlace,
  onLivePlaces,
  onStatus,
  onUnavailable,
}: {
  apiKey: string;
  mapId?: string;
  activeCity: CityId;
  activeLayer: LayerId | "all";
  liveSearchQuery: string;
  places: Place[];
  selectedPlace: Place;
  userLocation?: UserLocation | null;
  searchRadiusMiles: number;
  onViewportChange: (
    center: { lat: number; lng: number },
    radiusMiles: number,
    zoom: number,
  ) => void;
  onPickPlace: (place: Place) => void;
  onLivePlaces: (places: Place[]) => void;
  onStatus: (status: LiveStatus) => void;
  onUnavailable: (message: string) => void;
}) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapLike | null>(null);
  const markersRef = useRef<ManagedGoogleMarker[]>([]);
  const mapMoveIntentRef = useRef(false);
  const suppressViewportChangeRef = useRef(false);
  const viewportChangeTimeoutRef = useRef<number | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setMapsReady(false);
    setMapError("");

    loadGoogleMapsSafely(apiKey)
      .then((result) => {
        if (cancelled || !mapNodeRef.current) return;
        if (!result.ok) {
          throw new Error(result.message);
        }

        const google = getGoogleMaps();
        const MapConstructor = google.maps?.Map;
        if (!MapConstructor) {
          throw new Error("Google Maps constructor is unavailable.");
        }
        const preset = mapPresetForCity(activeCity, userLocation);

        mapRef.current = new MapConstructor(mapNodeRef.current, {
          center: { lat: preset.lat, lng: preset.lng },
          zoom: preset.zoom,
          mapId: mapId || "DEMO_MAP_ID",
          clickableIcons: true,
          gestureHandling: "greedy",
          fullscreenControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          cameraControl: true,
          styles: [
            { featureType: "transit", stylers: [{ saturation: -35 }] },
            { featureType: "water", stylers: [{ color: "#b8d7dc" }] },
          ],
        }) as GoogleMapLike;

        mapRef.current.addListener("dragstart", () => {
          mapMoveIntentRef.current = true;
        });
        mapRef.current.addListener("zoom_changed", () => {
          if (suppressViewportChangeRef.current) return;
          mapMoveIntentRef.current = true;
        });
        setMapsReady(true);
        onStatus({
          source: "google",
          message: "Google Maps is ready. Loading live Places results...",
          count: 0,
          loading: true,
        });
      })
      .catch((error) => {
        const message = getErrorMessage(error);
        setMapError(message);
        onStatus({
          source: "curated",
          message,
          count: 0,
          loading: false,
        });
        onUnavailable(message);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, activeCity, mapId, onStatus, onUnavailable, userLocation]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    const preset = mapPresetForCity(activeCity, userLocation);
    suppressViewportChangeRef.current = true;
    mapRef.current.setCenter({ lat: preset.lat, lng: preset.lng });
    mapRef.current.setZoom(preset.zoom);
  }, [activeCity, mapsReady, userLocation]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    let cancelled = false;
    onLivePlaces([]);
    onStatus({
      source: "google",
      message: "Fetching live Google Places result pages...",
      count: 0,
      loading: true,
    });

    searchGooglePlaces({
      activeCity,
      activeLayer,
      liveSearchQuery,
      userLocation,
      searchRadiusMiles,
    })
      .then((result) => {
        if (cancelled) return;

        onLivePlaces(result.places);
        onStatus({
          source: "google",
          message: result.places.length
            ? liveSearchQuery
              ? `Live Google results for "${liveSearchQuery}" loaded.`
              : result.message
            : result.message,
          count: result.places.length,
          loading: false,
        });
      })
      .catch((error) => {
        if (cancelled) return;

        onLivePlaces([]);
        onStatus({
          source: "google",
          message: getErrorMessage(error),
          count: 0,
          loading: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeCity,
    activeLayer,
    liveSearchQuery,
    mapsReady,
    onLivePlaces,
    onStatus,
    searchRadiusMiles,
    userLocation,
  ]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;
    const google = getGoogleMaps();
    const LatLng = google.maps?.LatLng;
    if (!LatLng) return;

    const listener = mapRef.current.addListener("idle", () => {
      if (suppressViewportChangeRef.current) {
        suppressViewportChangeRef.current = false;
        mapMoveIntentRef.current = false;
        return;
      }

      if (!mapMoveIntentRef.current) return;

      mapMoveIntentRef.current = false;
      if (viewportChangeTimeoutRef.current) {
        window.clearTimeout(viewportChangeTimeoutRef.current);
      }

      viewportChangeTimeoutRef.current = window.setTimeout(() => {
        const center = mapRef.current?.getCenter();
        const bounds = mapRef.current?.getBounds();
        const zoom = mapRef.current?.getZoom?.() ?? 14;
        if (!center || !bounds) return;

        const northEast = bounds.getNorthEast();
        const centerPoint = readLatLng(center);
        const northEastPoint = readLatLng(northEast);
        if (!centerPoint || !northEastPoint) return;

        const centerLatLng = new LatLng(centerPoint.lat, centerPoint.lng);
        const edgeLatLng = new LatLng(northEastPoint.lat, centerPoint.lng);
        const radiusMeters = google.maps?.geometry?.spherical?.computeDistanceBetween
          ? google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, edgeLatLng)
          : radiusMilesToMeters(searchRadiusMiles);
        const radiusMiles = Math.max(5, Math.min(30, radiusMeters / 1609.344));

        onViewportChange(
          {
            lat: centerPoint.lat,
            lng: centerPoint.lng,
          },
          radiusMiles,
          zoom,
        );
      }, 650);
    });

    return () => {
      listener.remove();
      if (viewportChangeTimeoutRef.current) {
        window.clearTimeout(viewportChangeTimeoutRef.current);
      }
    };
  }, [mapsReady, onViewportChange, searchRadiusMiles]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    let cancelled = false;
    clearGooglePlaceMarkers(markersRef.current);
    markersRef.current = [];

    createGooglePlaceMarkers({
      map: mapRef.current,
      places: visiblePlaces,
      selectedPlaceId: selectedPlace.id,
      onPickPlace,
    })
      .then((markers) => {
        if (cancelled) {
          clearGooglePlaceMarkers(markers);
          return;
        }

        markersRef.current = markers;
      })
      .catch((error) => {
        onStatus({
          source: "google",
          message: getErrorMessage(error),
          count: visiblePlaces.length,
          loading: false,
        });
      });

    return () => {
      cancelled = true;
      clearGooglePlaceMarkers(markersRef.current);
      markersRef.current = [];
    };
  }, [visiblePlaces, selectedPlace.id, mapsReady, onPickPlace, onStatus]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !visiblePlaces.length) return;
    const google = getGoogleMaps();
    const LatLngBounds = google.maps?.LatLngBounds;
    if (!LatLngBounds) return;

    const mappablePlaces = visiblePlaces.filter((place) => place.layer !== "reddit");
    if (!mappablePlaces.length) return;

    const bounds = new LatLngBounds();
    mappablePlaces.forEach((place) => {
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    if (mappablePlaces.length === 1) {
      suppressViewportChangeRef.current = true;
      mapRef.current.setCenter({ lat: mappablePlaces[0].lat, lng: mappablePlaces[0].lng });
      mapRef.current.setZoom(15);
      return;
    }

    suppressViewportChangeRef.current = true;
    mapRef.current.fitBounds(bounds, 68);
  }, [activeCity, activeLayer, liveSearchQuery, mapsReady, visiblePlaces]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || selectedPlace.layer === "reddit") return;
    if (activeLayer === "all" && !liveSearchQuery) return;
    suppressViewportChangeRef.current = true;
    mapRef.current.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
  }, [
    activeLayer,
    liveSearchQuery,
    selectedPlace.id,
    selectedPlace.lat,
    selectedPlace.lng,
    selectedPlace.layer,
    mapsReady,
  ]);

  return (
    <div className="city-map google-map-shell">
      <div className="google-map" ref={mapNodeRef} />
      {!mapsReady && (
        <div className="map-loading-overlay">
          <strong>{mapError ? "Google Maps unavailable" : "Loading Google Maps"}</strong>
          <span>
            {mapError ||
              "If this stays here, check API referrers, billing, Maps JavaScript API, and Places API."}
          </span>
        </div>
      )}
      <div className="google-map-badge">Google Maps + Places</div>
    </div>
  );
}
