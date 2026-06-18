import type { CityId, LayerId, Place } from "../../data/places";
import type { UserLocation } from "../../lib/lifelayers";

export type UserPreferences = {
  activeLayer: LayerId | "all";
  activeCity: CityId;
  priceFilter: Place["price"] | "all";
  vibeFilter: string;
  subcategoryFilter: string;
  pulseFilter: Place["reddit"]["pulse"] | "all";
  sortMode: "signal" | "rating" | "reviews" | "name";
  savedOnly: boolean;
  savedIds: string[];
  liveSearchQuery: string;
  userLocation: UserLocation | null;
  savedLocations: UserLocation[];
  searchRadiusMiles: number;
};

export type PreferencesResult =
  | {
      ok: true;
      preferences?: Partial<UserPreferences>;
    }
  | {
      ok: false;
      message: string;
    };
