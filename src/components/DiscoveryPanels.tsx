import type { CSSProperties, Ref } from "react";
import type { LayerId, Neighborhood, Place } from "../data/places";
import { layers } from "../data/places";
import { layerColor, type LiveStatus, type PlanPreset } from "../lib/lifelayers";

export function LiveSourceBar({ status }: { status: LiveStatus }) {
  return (
    <section className="source-bar" aria-label="Data source status">
      <div>
        <span className={status.source === "google" ? "source-dot live" : "source-dot"} />
        <strong>{status.source === "google" ? "Live Google source" : "Curated source"}</strong>
        <small>{status.message}</small>
      </div>
      <div className="source-metrics">
        <span>{status.loading ? "Loading" : `${status.count} live`}</span>
      </div>
    </section>
  );
}

export function LayerCoverageStrip({
  activeLayer,
  counts,
  liveCount,
  onPickLayer,
}: {
  activeLayer: LayerId | "all";
  counts: Record<LayerId, number>;
  liveCount: number;
  onPickLayer: (layer: LayerId | "all") => void;
}) {
  return (
    <section className="coverage-strip" aria-label="Layer coverage">
      <button className={activeLayer === "all" ? "active" : ""} onClick={() => onPickLayer("all")}>
        <span className="coverage-dot all">A</span>
        <strong>All layers</strong>
        <small>{Object.values(counts).reduce((total, count) => total + count, 0)} mapped</small>
      </button>

      {layers
        .filter((layer) => layer.id !== "reddit")
        .map((layer) => (
          <button
            key={layer.id}
            className={activeLayer === layer.id ? "active" : ""}
            onClick={() => onPickLayer(layer.id)}
          >
            <span
              className="coverage-dot"
              style={{ "--layer-color": layerColor[layer.id] } as CSSProperties}
            >
              {layer.symbol}
            </span>
            <strong>{layer.label}</strong>
            <small>{counts[layer.id]} live + curated</small>
          </button>
        ))}

      <div className="coverage-live">
        <span className="source-dot live" />
        <strong>{liveCount}</strong>
        <small>Google Places</small>
      </div>
    </section>
  );
}

export function LiveGoogleSearch({
  value,
  activeQuery,
  disabled,
  onChange,
  onSubmit,
  onClear,
}: {
  value: string;
  activeQuery: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  return (
    <section className="live-search-panel" aria-label="Live Google Places search">
      <div>
        <p className="eyebrow">Google Places Search</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <input
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search live places: ramen, coffee, museums, date spots..."
          />
          <button disabled={disabled || !value.trim()} type="submit">
            Search
          </button>
          <button disabled={disabled || !activeQuery} type="button" onClick={onClear}>
            Clear
          </button>
        </form>
      </div>
      <div className="active-query">
        {activeQuery ? <span>{activeQuery}</span> : <span>Layer-based live search</span>}
      </div>
    </section>
  );
}

export function ResultsBoard({
  places: visiblePlaces,
  selectedId,
  savedIds,
  resultListRef,
  loading,
  loadingLabel,
  onPick,
  onSave,
}: {
  places: Place[];
  selectedId: string;
  savedIds: string[];
  resultListRef?: Ref<HTMLElement>;
  loading: boolean;
  loadingLabel: string;
  onPick: (place: Place) => void;
  onSave: (place: Place) => void;
}) {
  return (
    <section
      className="results-board"
      aria-busy={loading}
      aria-label="Filtered place results"
      ref={resultListRef}
    >
      <div className="results-heading">
        <div>
          <p className="eyebrow">Place directory</p>
          <h3>{visiblePlaces.length} places matching the map</h3>
        </div>
        <small>Full list stays visible beside the map, sorted by your filters.</small>
      </div>

      {loading && (
        <div className="results-loading" role="status">
          <span className="mini-spinner" aria-hidden="true" />
          <strong>{loadingLabel}</strong>
        </div>
      )}

      {visiblePlaces.length ? (
        <div className="result-card-grid">
          {visiblePlaces.map((place) => {
            const isSelected = place.id === selectedId;
            const isSaved = savedIds.includes(place.id);
            const layer = layers.find((item) => item.id === place.layer);
            const qualityLabel = place.rating
              ? `${place.rating.toFixed(1)} Google rating`
              : `${place.signal}/100 LifeLayers signal`;
            const volumeLabel = `${place.userRatingsTotal ?? place.mentions} ${
              place.source === "google" ? "reviews" : "mentions"
            }`;

            return (
              <article
                key={place.id}
                className={isSelected ? "result-card selected" : "result-card"}
                style={{ "--accent": layerColor[place.layer] } as CSSProperties}
              >
                <button className="result-main" onClick={() => onPick(place)}>
                  {place.photoUrl && (
                    <img className="result-photo" src={place.photoUrl} alt="" loading="lazy" />
                  )}
                  <span className="result-topline">
                    <span className="result-layer">{layer?.label ?? place.layer}</span>
                    <span>{place.source === "google" ? "Google Places" : "Curated local"}</span>
                  </span>
                  <strong>{place.name}</strong>
                  <small className="result-location">
                    {place.neighborhood}, {place.city} - {place.kind} - {place.price}
                  </small>
                  <p>{place.summary}</p>
                  {place.address && <small className="result-address">{place.address}</small>}
                </button>
                <div className="result-meta">
                  <span>{qualityLabel}</span>
                  <span>{volumeLabel}</span>
                  <span>{place.reddit.pulse} pulse</span>
                  <button aria-pressed={isSaved} onClick={() => onSave(place)}>
                    {isSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={loading ? "empty-results loading-empty" : "empty-results"}>
          <strong>{loading ? "Refreshing places..." : "No places match those filters."}</strong>
          <p>
            {loading
              ? "Google Places is checking this filter combination now."
              : "Try clearing one filter or picking a broader planning preset."}
          </p>
        </div>
      )}
    </section>
  );
}

export type ActiveFilterChip = {
  id: string;
  label: string;
  onClear?: () => void;
};

export function ActiveFilterBar({
  chips,
  activePresetLabel,
  resultCount,
  loading,
  loadingLabel,
  onResetFilters,
}: {
  chips: ActiveFilterChip[];
  activePresetLabel?: string;
  resultCount: number;
  loading: boolean;
  loadingLabel: string;
  onResetFilters: () => void;
}) {
  return (
    <section className="active-filter-bar" aria-busy={loading} aria-label="Active filters">
      <div>
        <p className="eyebrow">Active filters</p>
        <div className="active-filter-chips">
          {activePresetLabel && (
            <span className="active-preset-chip">Preset: {activePresetLabel}</span>
          )}
          {chips.length ? (
            chips.map((chip) =>
              chip.onClear ? (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.onClear}
                  aria-label={`Clear ${chip.label}`}
                >
                  {chip.label}
                </button>
              ) : (
                <span key={chip.id}>{chip.label}</span>
              ),
            )
          ) : (
            <span>No filters active</span>
          )}
        </div>
      </div>
      <div className="active-filter-actions">
        {loading && (
          <span className="filter-loading" role="status">
            <span className="mini-spinner" aria-hidden="true" />
            {loadingLabel}
          </span>
        )}
        <strong>{loading ? "Updating..." : `${resultCount} places`}</strong>
        {(chips.length > 0 || activePresetLabel) && (
          <button className="text-action" onClick={onResetFilters}>
            Clear
          </button>
        )}
      </div>
    </section>
  );
}

export function NeighborhoodCard({ neighborhood }: { neighborhood: Neighborhood }) {
  return (
    <article className="neighborhood-card">
      <div>
        <strong>{neighborhood.name}</strong>
        <small>{neighborhood.city}</small>
      </div>
      <p>{neighborhood.description}</p>
      <div className="tag-row">
        {neighborhood.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <meter value={neighborhood.score} min="0" max="100" />
    </article>
  );
}

export type MapToolbarProps = {
  visibleCount: number;
  compareMode: boolean;
  hasSelectedPlace: boolean;
  hasExportPlaces: boolean;
  actionStatus: string;
  onToggleCompare: () => void;
  onShare: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
};

export function MapToolbar({
  visibleCount,
  compareMode,
  hasSelectedPlace,
  hasExportPlaces,
  actionStatus,
  onToggleCompare,
  onShare,
  onExportCsv,
  onExportJson,
}: MapToolbarProps) {
  return (
    <>
      <div className="map-toolbar">
        <div>
          <p className="eyebrow">Live prototype</p>
          <h2>{visibleCount} places in view</h2>
        </div>
        <div className="map-actions" aria-label="Map actions">
          <button className={compareMode ? "toggle active" : "toggle"} onClick={onToggleCompare}>
            Compare
          </button>
          <button className="secondary-action" disabled={!hasSelectedPlace} onClick={onShare}>
            Share
          </button>
          <button className="secondary-action" disabled={!hasExportPlaces} onClick={onExportCsv}>
            CSV
          </button>
          <button className="primary-action" disabled={!hasExportPlaces} onClick={onExportJson}>
            Export
          </button>
        </div>
      </div>

      <div className="status-toast" aria-live="polite">
        {actionStatus || "Ready for live discovery."}
      </div>
    </>
  );
}

export function PresetRow({
  presets,
  activePresetLabel,
  onApplyPreset,
}: {
  presets: PlanPreset[];
  activePresetLabel?: string;
  onApplyPreset: (preset: PlanPreset) => void;
}) {
  return (
    <div className="preset-row" aria-label="Planning presets">
      {presets.map((preset) => (
        <button
          key={preset.label}
          className={activePresetLabel === preset.label ? "active" : ""}
          aria-pressed={activePresetLabel === preset.label}
          onClick={() => onApplyPreset(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
