import type { CityId } from "../data/places";
import type { UserLocation } from "../lib/lifelayers";
import { InlineStatus, PermissionState } from "./common";

type TopBarProps = {
  activeCity: CityId;
  userLocation: UserLocation | null;
  savedLocations: UserLocation[];
  locationDraft: string;
  locationStatus: string;
  findingLocation: boolean;
  searchRadiusMiles: number;
  onLocationDraftChange: (value: string) => void;
  onRadiusChange: (radiusMiles: number) => void;
  onFindLocation: () => void;
  onSaveLocation: () => void;
  onSelectSavedLocation: (locationId: string) => void;
  onUseCurrentLocation: () => void;
  onOpenPalette: () => void;
};

export function TopBar({
  activeCity,
  userLocation,
  savedLocations,
  locationDraft,
  locationStatus,
  findingLocation,
  searchRadiusMiles,
  onLocationDraftChange,
  onRadiusChange,
  onFindLocation,
  onSaveLocation,
  onSelectSavedLocation,
  onUseCurrentLocation,
  onOpenPalette,
}: TopBarProps) {
  const activeSavedLocationId = userLocation?.source === "saved" ? (userLocation.id ?? "") : "";
  const canSaveLocation =
    Boolean(userLocation) &&
    !savedLocations.some((location) => location.id && location.id === userLocation?.id);
  const hasLocationIssue =
    !userLocation && /blocked|denied|not supported|failed/i.test(locationStatus);

  return (
    <section className="topbar" aria-label="LifeLayers controls">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          LL
        </div>
        <div>
          <p className="eyebrow">Location-aware</p>
          <h1>LifeLayers</h1>
        </div>
      </div>

      <button className="command-trigger" onClick={onOpenPalette}>
        <span aria-hidden="true">/</span>
        <span>Search places, moods, plans</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="location-planner" aria-label="Location planner">
        <div className="saved-city-picker">
          <select
            value={activeSavedLocationId}
            onChange={(event) => onSelectSavedLocation(event.target.value)}
            disabled={!savedLocations.length}
            aria-label="Saved cities"
          >
            <option value="">
              {savedLocations.length ? "Saved cities" : "No saved cities yet"}
            </option>
            {savedLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </div>

        <label className="radius-picker">
          <span>Distance</span>
          <select
            value={searchRadiusMiles}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            aria-label="Search distance"
          >
            {[5, 10, 25, 30].map((radius) => (
              <option key={radius} value={radius}>
                {radius} mi
              </option>
            ))}
          </select>
        </label>

        <form
          className="city-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            onFindLocation();
          }}
        >
          <input
            value={locationDraft}
            onChange={(event) => onLocationDraftChange(event.target.value)}
            placeholder="Find a city to plan ahead"
            aria-label="Find a city"
          />
          <button type="submit" disabled={findingLocation || !locationDraft.trim()}>
            {findingLocation ? "Finding" : "Find"}
          </button>
        </form>
      </div>

      <div className="city-tabs location-tabs" aria-label="Location actions">
        <button
          className={activeCity === "nearby" && userLocation?.source === "browser" ? "active" : ""}
          onClick={onUseCurrentLocation}
        >
          Near me
        </button>
        <button disabled={!canSaveLocation} onClick={onSaveLocation}>
          Save city
        </button>
      </div>

      {hasLocationIssue ? (
        <PermissionState
          className="location-status"
          title="Location needs permission"
          description={`${locationStatus} Search for a city above or try precise location again.`}
          actionLabel="Precise location"
          onAction={onUseCurrentLocation}
        />
      ) : (
        <div className="location-status">
          <InlineStatus
            message={userLocation ? userLocation.label : locationStatus}
            variant={findingLocation ? "info" : userLocation ? "success" : "warning"}
          />
          <button type="button" onClick={onUseCurrentLocation}>
            Precise location
          </button>
        </div>
      )}
    </section>
  );
}
