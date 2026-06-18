import { describe, expect, it, vi } from "vitest";
import { clearGooglePlaceMarkers } from "./googleMarkers";
import type { GoogleMapLike } from "./googlePlaceTypes";

describe("googleMarkers", () => {
  it("removes marker listeners and detaches markers from the map", () => {
    const listener = { remove: vi.fn() };
    const marker = { map: {} as GoogleMapLike };

    clearGooglePlaceMarkers([{ marker, listeners: [listener] }]);

    expect(listener.remove).toHaveBeenCalledOnce();
    expect(marker.map).toBeNull();
  });

  it("cleans up legacy markers with setMap", () => {
    const listener = { remove: vi.fn() };
    const marker = { setMap: vi.fn() };

    clearGooglePlaceMarkers([{ marker, listeners: [listener] }]);

    expect(listener.remove).toHaveBeenCalledOnce();
    expect(marker.setMap).toHaveBeenCalledWith(null);
  });
});
