import { describe, expect, it, vi } from "vitest";
import { clearAdvancedPlaceMarkers } from "./markerService";
import type { GoogleMapLike } from "./placeTypes";

describe("markerService", () => {
  it("removes marker listeners and detaches markers from the map", () => {
    const listener = { remove: vi.fn() };
    const marker = { map: {} as GoogleMapLike };

    clearAdvancedPlaceMarkers([{ marker, listeners: [listener] }]);

    expect(listener.remove).toHaveBeenCalledOnce();
    expect(marker.map).toBeNull();
  });
});
