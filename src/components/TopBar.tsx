import type { CityId } from "../data/places";
import { cityOptions } from "../lib/lifelayers";

type TopBarProps = {
  activeCity: CityId;
  onCityChange: (city: CityId) => void;
  onOpenPalette: () => void;
};

export function TopBar({ activeCity, onCityChange, onOpenPalette }: TopBarProps) {
  return (
    <section className="topbar" aria-label="LifeLayers controls">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          LL
        </div>
        <div>
          <p className="eyebrow">NYC + Jersey City</p>
          <h1>LifeLayers</h1>
        </div>
      </div>

      <button className="command-trigger" onClick={onOpenPalette}>
        <span aria-hidden="true">/</span>
        <span>Search places, moods, plans</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="city-tabs" aria-label="City filters">
        {cityOptions.map((city) => (
          <button
            key={city.id}
            className={activeCity === city.id ? "active" : ""}
            onClick={() => onCityChange(city.id)}
          >
            {city.label}
          </button>
        ))}
      </div>
    </section>
  );
}
