import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CityId, LayerId, Neighborhood, Place } from "../data/places";
import { layers } from "../data/places";
import {
  clampZoom,
  estimateNeighborhood,
  getErrorMessage,
  googleSignal,
  inferLayerFromSearch,
  layerColor,
  lngLatToWorld,
  mapPresetForCity,
  mapPresets,
  priceFromGoogle,
  radiusMilesToMeters,
  tileSize,
  type LiveStatus,
  type UserLocation,
} from "../lib/lifelayers";
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

export function loadGoogleMaps(apiKey: string) {
  const win = window as Window & {
    google?: {
      maps?: unknown;
    };
    initLifeLayersGoogle?: () => void;
    gm_authFailure?: () => void;
    lifeLayersGooglePromise?: Promise<void>;
  };

  if (win.google?.maps) return Promise.resolve();
  if (win.lifeLayersGooglePromise) return win.lifeLayersGooglePromise;

  win.lifeLayersGooglePromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Google Maps did not finish loading. Check API restrictions, billing, and enabled APIs.",
        ),
      );
    }, 9000);

    const finish = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };

    const fail = (message: string) => {
      window.clearTimeout(timeoutId);
      win.lifeLayersGooglePromise = undefined;
      reject(new Error(message));
    };

    win.initLifeLayersGoogle = finish;
    win.gm_authFailure = () =>
      fail(
        "Google Maps rejected this key. Add localhost/127.0.0.1 to HTTP referrers, enable Maps JavaScript API and Places API, and confirm billing.",
      );

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&v=weekly&loading=async&libraries=places,geometry&callback=initLifeLayersGoogle`;
    script.async = true;
    script.onerror = () => fail("Google Maps failed to load. Check the API key and network access.");
    document.head.appendChild(script);
  });

  return win.lifeLayersGooglePromise;
}

type GoogleSearchSpec = {
  layer: LayerId;
  city: Place["city"];
  cityName: string;
  query: string;
  searchTag?: string;
  center: { lat: number; lng: number; zoom: number };
  limit: number;
  radius: number;
  pages: number;
};

function getSearchSpecs(
  activeCity: CityId,
  activeLayer: LayerId | "all",
  liveSearchQuery: string,
  userLocation?: UserLocation | null,
  searchRadiusMiles = 25,
): GoogleSearchSpec[] {
  const nearbyRadius = radiusMilesToMeters(searchRadiusMiles);
  const cityTargets =
    activeCity === "nearby" && userLocation
      ? [
          {
            id: "nearby" as const,
            name: userLocation.label || "your area",
            city: "Near you" as const,
            preset: { lat: userLocation.lat, lng: userLocation.lng, zoom: 14 },
          },
        ]
      : activeCity === "nearby"
        ? []
        : activeCity === "all"
      ? [
          { id: "nyc" as const, name: "New York City", city: "NYC" as const, preset: mapPresets.nyc },
          { id: "jc" as const, name: "Jersey City", city: "Jersey City" as const, preset: mapPresets.jc },
        ]
      : [
          activeCity === "nyc"
            ? { id: "nyc" as const, name: "New York City", city: "NYC" as const, preset: mapPresets.nyc }
            : { id: "jc" as const, name: "Jersey City", city: "Jersey City" as const, preset: mapPresets.jc },
        ];

  const trimmedSearch = liveSearchQuery.trim();

  if (trimmedSearch) {
    const searchLayer = inferLayerFromSearch(trimmedSearch, activeLayer);

    return cityTargets.map((city) => ({
      layer: searchLayer,
      city: city.city,
      cityName: city.name,
      query: city.id === "nearby" ? trimmedSearch : `${trimmedSearch} ${city.name}`,
      searchTag: trimmedSearch,
      center: city.preset,
      limit: 60,
      radius: city.id === "nyc" ? 15000 : city.id === "nearby" ? nearbyRadius : 7000,
      pages: 3,
    }));
  }

  const layerTargets: LayerId[] =
    activeLayer === "all"
      ? ["eat", "do", "vibe", "memory"]
      : activeLayer === "reddit"
        ? []
        : [activeLayer];

  const broadQueryByLayer: Record<LayerId, string[]> = {
    eat: ["restaurants cafes bakeries coffee bars brunch pizza ramen food halls"],
    do: ["things to do parks museums galleries bookstores live music events"],
    reddit: [],
    memory: ["historic landmarks museums cultural sites architecture neighborhoods"],
    vibe: ["date spots cocktail bars rooftop bars quiet cafes waterfront lounges"],
  };

  const focusedQueryByLayer: Record<LayerId, string[]> = {
    eat: ["restaurants", "cafes coffee bakeries", "brunch pizza ramen bars"],
    do: ["things to do parks museums", "bookstores galleries live music events"],
    reddit: [],
    memory: ["historic landmarks museums", "cultural sites architecture"],
    vibe: ["date spots cocktail bars", "quiet cafes rooftops waterfront lounges"],
  };

  return cityTargets.flatMap((city) =>
    layerTargets.flatMap((layer) => {
      const queries = activeLayer === "all" ? broadQueryByLayer[layer] : focusedQueryByLayer[layer];

      return queries.map((query) => ({
        layer,
        city: city.city,
        cityName: city.name,
        query: city.id === "nearby" ? query : `${query} in ${city.name}`,
        searchTag: query,
        center: city.preset,
        limit: activeLayer === "all" ? 60 : 60,
        radius: city.id === "nyc" ? 13500 : city.id === "nearby" ? nearbyRadius : 6500,
        pages: 3,
      }));
    }),
  );
}

function placeFromGoogleResult(
  result: Record<string, any>,
  layer: LayerId,
  city: Place["city"],
  searchTag?: string,
): Place | null {
  const location = result.geometry?.location;
  const lat = typeof location?.lat === "function" ? location.lat() : undefined;
  const lng = typeof location?.lng === "function" ? location.lng() : undefined;

  if (typeof lat !== "number" || typeof lng !== "number" || !result.name) return null;

  const rating = typeof result.rating === "number" ? result.rating : undefined;
  const total =
    typeof result.user_ratings_total === "number" ? result.user_ratings_total : undefined;
  const kind =
    Array.isArray(result.types) && result.types.length
      ? String(result.types[0]).replaceAll("_", " ")
      : layer === "eat"
        ? "Restaurant"
        : "Place";
  const price = priceFromGoogle(result.price_level);
  const neighborhood =
    city === "Near you" ? result.vicinity ?? "Near your location" : estimateNeighborhood(lat, lng, city);
  const signal = googleSignal(rating, total);
  const name = String(result.name);
  const firstPhoto = Array.isArray(result.photos) ? result.photos[0] : undefined;
  const photoUrl =
    typeof firstPhoto?.getUrl === "function"
      ? firstPhoto.getUrl({ maxWidth: 960, maxHeight: 640 })
      : undefined;
  const photoAttributions = Array.isArray(firstPhoto?.html_attributions)
    ? firstPhoto.html_attributions.map((attribution: unknown) => String(attribution))
    : undefined;

  return {
    id: `google-${result.place_id ?? `${name}-${lat}-${lng}`}`,
    name,
    neighborhood,
    city,
    layer,
    kind,
    price,
    bestFor: [
      "live Google result",
      layer === "eat" ? "nearby food" : "nearby plan",
      layer === "eat" ? (price === "$" ? "budget" : "dining") : kind,
      searchTag,
    ].filter((tag): tag is string => Boolean(tag)),
    vibe: [layer === "eat" ? "food" : "discoverable", rating && rating >= 4.5 ? "high-rated" : "active"],
    x: 0,
    y: 0,
    lat,
    lng,
    source: "google",
    googlePlaceId: result.place_id,
    photoUrl,
    photoAttributions,
    rating,
    userRatingsTotal: total,
    address: result.formatted_address ?? result.vicinity,
    openNow: result.opening_hours?.open_now,
    signal,
    mentions: total ?? 0,
    freshness: result.business_status === "OPERATIONAL" ? "Live on Google" : "Google result",
    summary: `${name} is a live Google Places result${
      rating ? ` rated ${rating.toFixed(1)}` : ""
    }${total ? ` from ${total.toLocaleString()} reviews` : ""}.`,
    localTip: result.formatted_address ?? result.vicinity ?? "Open in Google Maps for the latest details.",
    memory:
      layer === "memory"
        ? "Google identifies this as a cultural or landmark place; LifeLayers can add story context later."
        : "Live Google data gives the place surface; LifeLayers adds local context, Reddit pulse, and planning layers.",
    reddit: {
      subreddits: ["Google Places"],
      pulse: total && total > 1000 ? "Classic" : rating && rating >= 4.5 ? "Rising" : "Steady",
      consensus: "Sourced from Google Places. Reddit/community interpretation can be layered on top.",
      warnings: ["Check hours and availability before going"],
    },
  };
}

function fetchGoogleTextSearch(
  service: any,
  google: any,
  spec: GoogleSearchSpec,
): Promise<Place[]> {
  return new Promise((resolve) => {
    const collected: Place[] = [];
    let pageCount = 0;

    const handleResults = (
      results: Array<Record<string, any>> | null,
      status: string,
      pagination?: { hasNextPage: boolean; nextPage: () => void },
    ) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve(collected);
        return;
      }

      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        resolve(collected);
        return;
      }

      pageCount += 1;
      collected.push(
        ...results
          .map((result) => placeFromGoogleResult(result, spec.layer, spec.city, spec.searchTag))
          .filter((place): place is Place => Boolean(place)),
      );

      const shouldFetchNextPage =
        Boolean(pagination?.hasNextPage) && pageCount < spec.pages && collected.length < spec.limit;

      if (shouldFetchNextPage) {
        window.setTimeout(() => pagination?.nextPage(), 900);
        return;
      }

      resolve(collected.slice(0, spec.limit));
    };

    service.textSearch(
      {
        query: spec.query,
        location: new google.maps.LatLng(spec.center.lat, spec.center.lng),
        radius: spec.radius,
      },
      handleResults,
    );
  });
}

export function GoogleLiveMap({
  apiKey,
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
  activeCity: CityId;
  activeLayer: LayerId | "all";
  liveSearchQuery: string;
  places: Place[];
  selectedPlace: Place;
  userLocation?: UserLocation | null;
  searchRadiusMiles: number;
  onViewportChange: (center: { lat: number; lng: number }, radiusMiles: number, zoom: number) => void;
  onPickPlace: (place: Place) => void;
  onLivePlaces: (places: Place[]) => void;
  onStatus: (status: LiveStatus) => void;
  onUnavailable: (message: string) => void;
}) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapMoveIntentRef = useRef(false);
  const suppressViewportChangeRef = useRef(false);
  const viewportChangeTimeoutRef = useRef<number | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setMapsReady(false);
    setMapError("");

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapNodeRef.current) return;
        const google = (window as any).google;
        const preset = mapPresetForCity(activeCity, userLocation);

        mapRef.current = new google.maps.Map(mapNodeRef.current, {
          center: { lat: preset.lat, lng: preset.lng },
          zoom: preset.zoom,
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
        });

        serviceRef.current = new google.maps.places.PlacesService(mapRef.current);
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
  }, [apiKey, activeCity, onStatus, onUnavailable, userLocation]);

  useEffect(() => {
    const google = (window as any).google;
    if (!mapsReady || !mapRef.current || !google) return;

    const preset = mapPresetForCity(activeCity, userLocation);
    suppressViewportChangeRef.current = true;
    mapRef.current.setCenter({ lat: preset.lat, lng: preset.lng });
    mapRef.current.setZoom(preset.zoom);
  }, [activeCity, mapsReady, userLocation]);

  useEffect(() => {
    const google = (window as any).google;
    const service = serviceRef.current;

    if (!mapsReady || !google || !service) return;

    const specs = getSearchSpecs(activeCity, activeLayer, liveSearchQuery, userLocation, searchRadiusMiles);
    if (!specs.length) {
      onLivePlaces([]);
      onStatus({
        source: "google",
        message:
          activeCity === "nearby"
            ? "Share your location to search Google Places near you."
            : "Reddit Pulse uses curated/community data. Switch layers or search Google Places.",
        count: 0,
        loading: false,
      });
      return;
    }

    let cancelled = false;
    onLivePlaces([]);
    onStatus({
      source: "google",
      message: "Fetching live Google Places result pages...",
      count: 0,
      loading: true,
    });

    Promise.all(specs.map((spec) => fetchGoogleTextSearch(service, google, spec)))
      .then((groups) => {
        if (cancelled) return;

        const seen = new Set<string>();
        const nextPlaces = groups
          .flat()
          .filter((place) => {
            const key = place.googlePlaceId ?? place.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => b.signal - a.signal);

        onLivePlaces(nextPlaces);
        onStatus({
          source: "google",
          message: nextPlaces.length
            ? liveSearchQuery
              ? `Live Google results for "${liveSearchQuery}" loaded.`
              : "Live Google Places pages loaded and sorted."
            : "No Google Places returned for this layer. Showing curated fallback.",
          count: nextPlaces.length,
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
  }, [activeCity, activeLayer, liveSearchQuery, mapsReady, onLivePlaces, onStatus, searchRadiusMiles, userLocation]);

  useEffect(() => {
    const google = (window as any).google;
    if (!mapsReady || !mapRef.current || !google) return;

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
        const centerLatLng = new google.maps.LatLng(center.lat(), center.lng());
        const edgeLatLng = new google.maps.LatLng(northEast.lat(), center.lng());
        const radiusMeters = google.maps.geometry?.spherical?.computeDistanceBetween
          ? google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, edgeLatLng)
          : radiusMilesToMeters(searchRadiusMiles);
        const radiusMiles = Math.max(5, Math.min(30, radiusMeters / 1609.344));

        onViewportChange(
          {
            lat: center.lat(),
            lng: center.lng(),
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
    const google = (window as any).google;
    if (!mapsReady || !mapRef.current || !google) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = visiblePlaces.map((place) => {
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        label: {
          text: layers.find((layer) => layer.id === place.layer)?.symbol ?? "P",
          color: "#ffffff",
          fontWeight: "900",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: layerColor[place.layer],
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: place.id === selectedPlace.id ? 13 : 10,
        },
      });

      marker.addListener("click", () => onPickPlace(place));
      return marker;
    });
  }, [visiblePlaces, selectedPlace.id, mapsReady, onPickPlace]);

  useEffect(() => {
    const google = (window as any).google;
    if (!mapsReady || !mapRef.current || !google || !visiblePlaces.length) return;

    const mappablePlaces = visiblePlaces.filter((place) => place.layer !== "reddit");
    if (!mappablePlaces.length) return;

    const bounds = new google.maps.LatLngBounds();
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
