import { layerColor, textMatches } from "../lib/lifelayers";
import type { Place } from "../data/places";

type CommandPaletteProps = {
  query: string;
  places: Place[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onPickPlace: (place: Place) => void;
  onQuickSearch: (query: string) => void;
};

export function CommandPalette({
  query,
  places: searchPlaces,
  onQueryChange,
  onClose,
  onPickPlace,
  onQuickSearch,
}: CommandPaletteProps) {
  const results = searchPlaces
    .filter((place) => !query || textMatches(place, query))
    .sort((a, b) => b.signal - a.signal)
    .slice(0, 6);

  const quickSearches = [
    "quiet cafe",
    "under $20",
    "date night",
    "rainy day",
    "waterfront",
    "late night",
  ];

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search LifeLayers"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-search">
          <span aria-hidden="true">/</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Try date night, Chinatown, quiet, waterfront..."
          />
          <button onClick={onClose}>Close</button>
        </div>

        <div className="quick-searches">
          {quickSearches.map((search) => (
            <button key={search} onClick={() => onQuickSearch(search)}>
              {search}
            </button>
          ))}
        </div>

        <div className="palette-results">
          {results.map((place) => (
            <button key={place.id} onClick={() => onPickPlace(place)}>
              <span
                className="result-dot"
                style={{ background: layerColor[place.layer] }}
                aria-hidden="true"
              />
              <span>
                <strong>{place.name}</strong>
                <small>
                  {place.neighborhood} - {place.city} - {place.kind}
                </small>
              </span>
              <em>{place.signal}</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
