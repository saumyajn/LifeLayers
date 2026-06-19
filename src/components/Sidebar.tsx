import type { CSSProperties } from "react";
import type { CityId, LayerId, Place } from "../data/places";
import { layers } from "../data/places";
import { AccountPanel } from "./AccountPanel";
import { EmptyState } from "./common";
import type { LifeLayersUser } from "../features/auth/authTypes";
import {
  cityMatches,
  layerColor,
  priceOptions,
  pulseOptions,
  sortOptions,
  type LayerSubcategoryOption,
  type PriceFilter,
  type PulseFilter,
  type SortMode,
  type SubcategoryFilter,
} from "../lib/lifelayers";

type SidebarProps = {
  activeLayer: LayerId | "all";
  activeCity: CityId;
  allPlaces: Place[];
  selectedPlace: Place;
  savedPlaces: Place[];
  layerCounts: Record<LayerId, number>;
  availableVibes: string[];
  priceFilter: PriceFilter;
  subcategoryFilter: SubcategoryFilter;
  subcategoryOptions: LayerSubcategoryOption[];
  vibeFilter: string;
  pulseFilter: PulseFilter;
  sortMode: SortMode;
  savedOnly: boolean;
  currentUser: LifeLayersUser | null;
  authBusy: boolean;
  firebaseConfigured: boolean;
  preferencesReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onLayerChange: (layer: LayerId | "all") => void;
  onSubcategoryChange: (subcategory: SubcategoryFilter) => void;
  onPriceChange: (price: PriceFilter) => void;
  onVibeChange: (vibe: string) => void;
  onPulseChange: (pulse: PulseFilter) => void;
  onSortChange: (sort: SortMode) => void;
  onSavedOnlyChange: (savedOnly: boolean) => void;
  onResetFilters: () => void;
  onPickSavedPlace: (place: Place) => void;
};

export function Sidebar({
  activeLayer,
  activeCity,
  allPlaces,
  selectedPlace,
  savedPlaces,
  layerCounts,
  availableVibes,
  priceFilter,
  subcategoryFilter,
  subcategoryOptions,
  vibeFilter,
  pulseFilter,
  sortMode,
  savedOnly,
  currentUser,
  authBusy,
  firebaseConfigured,
  preferencesReady,
  onSignIn,
  onSignOut,
  onLayerChange,
  onSubcategoryChange,
  onPriceChange,
  onVibeChange,
  onPulseChange,
  onSortChange,
  onSavedOnlyChange,
  onResetFilters,
  onPickSavedPlace,
}: SidebarProps) {
  return (
    <aside className="left-rail" aria-label="Layer filters">
      <AccountPanel
        user={currentUser}
        busy={authBusy}
        configured={firebaseConfigured}
        preferencesReady={preferencesReady}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      <div className="rail-section">
        <p className="rail-label">Layers</p>
        <button
          className={`layer-button ${activeLayer === "all" ? "active" : ""}`}
          onClick={() => onLayerChange("all")}
        >
          <span className="layer-symbol all">A</span>
          <span>
            <strong>All</strong>
            <small>
              {allPlaces.filter((place) => cityMatches(place, activeCity)).length} city signals
            </small>
          </span>
        </button>
        {layers.map((layer) => (
          <button
            key={layer.id}
            className={`layer-button ${activeLayer === layer.id ? "active" : ""}`}
            onClick={() => onLayerChange(layer.id)}
          >
            <span
              className="layer-symbol"
              style={{ "--layer-color": layerColor[layer.id] } as CSSProperties}
            >
              {layer.symbol}
            </span>
            <span>
              <strong>{layer.label}</strong>
              <small>
                {layerCounts[layer.id]} options - {layer.description}
              </small>
            </span>
          </button>
        ))}
      </div>

      <div className="rail-section filter-panel">
        <div className="rail-header">
          <p className="rail-label">Filters</p>
          <button className="text-action" onClick={onResetFilters}>
            Reset
          </button>
        </div>

        {subcategoryOptions.length > 0 && (
          <label>
            Layer option
            <select
              value={subcategoryFilter}
              onChange={(event) => onSubcategoryChange(event.target.value)}
            >
              <option value="all">Any option</option>
              {subcategoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Price
          <select
            value={priceFilter}
            onChange={(event) => onPriceChange(event.target.value as PriceFilter)}
          >
            {priceOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Vibe / Use case
          <select value={vibeFilter} onChange={(event) => onVibeChange(event.target.value)}>
            {availableVibes.map((vibe) => (
              <option key={vibe} value={vibe}>
                {vibe === "all" ? "Any vibe" : vibe}
              </option>
            ))}
          </select>
        </label>

        <label>
          Reddit pulse
          <select
            value={pulseFilter}
            onChange={(event) => onPulseChange(event.target.value as PulseFilter)}
          >
            {pulseOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort
          <select
            value={sortMode}
            onChange={(event) => onSortChange(event.target.value as SortMode)}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(event) => onSavedOnlyChange(event.target.checked)}
          />
          Saved only
        </label>
      </div>

      <div className="rail-section pulse-panel">
        <p className="rail-label">Reddit Pulse</p>
        <div className="pulse-meter">
          <span style={{ width: `${Math.min(96, selectedPlace.signal)}%` }} />
        </div>
        <strong>{selectedPlace.signal}/100 local signal</strong>
        <small>{selectedPlace.mentions} mapped mentions across local threads</small>
      </div>

      <div className="rail-section">
        <div className="rail-header">
          <p className="rail-label">Itinerary</p>
          <span>{savedPlaces.length}</span>
        </div>
        <div className="saved-list">
          {savedPlaces.length ? (
            savedPlaces.map((place) => (
              <button
                key={place.id}
                onClick={() => onPickSavedPlace(place)}
                aria-label={`Open ${place.name} in Google Maps`}
              >
                <span>{place.name}</span>
                <small>{place.neighborhood} - Open in Google Maps</small>
              </button>
            ))
          ) : (
            <EmptyState
              className="empty-copy"
              title="No saved places yet"
              description="Save places from the list or map to build an itinerary."
              variant="compact"
            />
          )}
        </div>
      </div>
    </aside>
  );
}
