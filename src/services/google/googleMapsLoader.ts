import type { GoogleMapsListener } from "./placeTypes";

type GoogleMapsNamespace = {
  maps?: {
    Map?: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
    Geocoder?: new () => {
      geocode: (
        request: { address: string },
        callback: (results: GoogleGeocoderResult[] | null, status: string) => void,
      ) => void;
    };
    LatLng?: new (lat: number, lng: number) => unknown;
    LatLngBounds?: new () => {
      extend: (point: { lat: number; lng: number }) => void;
    };
    event?: {
      clearInstanceListeners?: (instance: unknown) => void;
    };
    geometry?: {
      spherical?: {
        computeDistanceBetween?: (from: unknown, to: unknown) => number;
      };
    };
    importLibrary?: (name: string) => Promise<unknown>;
    places?: unknown;
  };
};

type GoogleGeocoderResult = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: () => number;
      lng?: () => number;
    };
  };
};

type LifeLayersGoogleWindow = Window & {
  google?: GoogleMapsNamespace;
  initLifeLayersGoogle?: () => void;
  gm_authFailure?: () => void;
  lifeLayersGooglePromise?: Promise<void>;
};

const GOOGLE_MAPS_TIMEOUT_MS = 9000;

export function getGoogleMaps() {
  const google = (window as LifeLayersGoogleWindow).google;
  if (!google?.maps) {
    throw new Error("Google Maps is not loaded yet.");
  }

  return google;
}

export function loadGoogleMaps(apiKey: string) {
  const win = window as LifeLayersGoogleWindow;

  if (!apiKey) {
    return Promise.reject(new Error("Missing Google Maps API key."));
  }

  if (win.google?.maps) return Promise.resolve();
  if (win.lifeLayersGooglePromise) return win.lifeLayersGooglePromise;

  win.lifeLayersGooglePromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Google Maps did not finish loading. Check API restrictions, billing, and enabled APIs.",
        ),
      );
    }, GOOGLE_MAPS_TIMEOUT_MS);

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
        "Google Maps rejected this key. Check HTTP referrers, Maps JavaScript API, Places API, billing, and App Check settings.",
      );

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&v=weekly&loading=async&libraries=places,geometry,marker&callback=initLifeLayersGoogle`;
    script.async = true;
    script.onerror = () =>
      fail("Google Maps failed to load. Check the API key, network access, and browser console.");
    document.head.appendChild(script);
  });

  return win.lifeLayersGooglePromise;
}

export async function importGoogleLibrary<TLibrary>(libraryName: string): Promise<TLibrary> {
  const google = getGoogleMaps();
  const importLibrary = google.maps?.importLibrary;

  if (typeof importLibrary !== "function") {
    throw new Error(`Google Maps importLibrary is unavailable for "${libraryName}".`);
  }

  return (await importLibrary(libraryName)) as TLibrary;
}

export async function geocodeAddress(apiKey: string, address: string) {
  await loadGoogleMaps(apiKey);
  const google = getGoogleMaps();
  const Geocoder = google.maps?.Geocoder;

  if (!Geocoder) {
    throw new Error("Google Geocoder is unavailable.");
  }

  const geocoder = new Geocoder();
  const result = await new Promise<GoogleGeocoderResult>((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results?.[0]) {
        reject(new Error(`Could not find "${address}". Try a city and state/country.`));
        return;
      }

      resolve(results[0]);
    });
  });

  const lat = result.geometry?.location?.lat?.();
  const lng = result.geometry?.location?.lng?.();

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error(`Could not read coordinates for "${address}".`);
  }

  return {
    lat,
    lng,
    label: String(result.formatted_address ?? address),
  };
}

export function clearGoogleListeners(instance: unknown) {
  const clearInstanceListeners = getGoogleMaps().maps?.event?.clearInstanceListeners;
  if (typeof clearInstanceListeners === "function") {
    clearInstanceListeners(instance);
  }
}

export function removeListener(listener: GoogleMapsListener | undefined) {
  listener?.remove();
}
