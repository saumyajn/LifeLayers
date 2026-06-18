import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CityId, Place } from "./data/places";
import { CommandPalette } from "./components/CommandPalette";
import {
  ActiveFilterBar,
  LiveGoogleSearch,
  LiveSourceBar,
  MapToolbar,
  NeighborhoodCard,
  PresetRow,
  ResultsBoard,
} from "./components/DiscoveryPanels";
import { GoogleLiveMap, RealMap } from "./components/MapViews";
import { PlaceDetail } from "./components/PlaceDetail";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { isFirebaseConfigured, type UserPreferences } from "./firebase";
import { useLifeLayersAuth } from "./hooks/useLifeLayersAuth";
import { useLifeLayersFilters } from "./hooks/useLifeLayersFilters";
import { useLocationPlanner } from "./hooks/useLocationPlanner";
import { usePlaceCollections } from "./hooks/usePlaceCollections";
import { usePlaceExports } from "./hooks/usePlaceExports";
import { usePlaceSharing } from "./hooks/usePlaceSharing";
import { useReviews } from "./hooks/useReviews";
import { useSavedPlaces } from "./hooks/useSavedPlaces";
import { useSelectedPlace } from "./hooks/useSelectedPlace";
import { useUserPreferences } from "./hooks/useUserPreferences";
import { planPresets, type LiveStatus } from "./lib/lifelayers";
import {
  buildUserPreferences,
  getExportPlaces,
  getPlanTitle,
  getSavedPlaces,
} from "./utils/placeState";

const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const googleMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

function App() {
  const [activeCity, setActiveCity] = useState<CityId>("nearby");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [livePlaces, setLivePlaces] = useState<Place[]>([]);
  const [actionStatus, setActionStatus] = useState("");
  const [googleMapAvailable, setGoogleMapAvailable] = useState(Boolean(googleApiKey));
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({
    source: googleApiKey ? "google" : "curated",
    message: googleApiKey
      ? "Google Maps enabled. Loading live Places results..."
      : "Add VITE_GOOGLE_MAPS_API_KEY to enable live Google Maps and Places.",
    count: 0,
    loading: Boolean(googleApiKey),
  });
  const resultListRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);

  const location = useLocationPlanner({
    googleApiKey,
    setActionStatus,
    setActiveCity,
  });

  const filters = useLifeLayersFilters({
    activeCity,
    setActiveCity,
    userLocation: location.userLocation,
    searchRadiusMiles: location.searchRadiusMiles,
  });

  const saved = useSavedPlaces();

  const {
    allPlaces,
    visiblePlaces,
    layerCounts,
    availableVibes,
    activeNeighborhoods,
    topNeighborhoods,
  } = usePlaceCollections({
    livePlaces,
    hasGoogleApiKey: Boolean(googleApiKey),
    filters: filters.filters,
    savedIds: saved.savedIds,
    activeSubcategory: filters.activeSubcategory,
    compareMode,
  });

  const savedPlaces = useMemo(
    () => getSavedPlaces(allPlaces, saved.savedIds),
    [allPlaces, saved.savedIds],
  );
  const exportPlaces = useMemo(
    () => getExportPlaces(savedPlaces, visiblePlaces),
    [savedPlaces, visiblePlaces],
  );

  const selected = useSelectedPlace(allPlaces, visiblePlaces);
  const auth = useLifeLayersAuth({ setActionStatus });

  const preferences = useMemo<UserPreferences>(
    () =>
      buildUserPreferences({
        filters: filters.filters,
        savedIds: saved.savedIds,
        userLocation: location.userLocation,
        savedLocations: location.savedLocations,
        searchRadiusMiles: location.searchRadiusMiles,
      }),
    [
      filters.filters,
      location.savedLocations,
      location.searchRadiusMiles,
      location.userLocation,
      saved.savedIds,
    ],
  );

  const preferenceSetters = useMemo(
    () => ({
      setActiveLayer: filters.setActiveLayer,
      setActiveCity,
      setPriceFilter: filters.setPriceFilter,
      setVibeFilter: filters.setVibeFilter,
      setSubcategoryFilter: filters.setSubcategoryFilter,
      setPulseFilter: filters.setPulseFilter,
      setSortMode: filters.setSortMode,
      setSavedOnly: filters.setSavedOnly,
      setSavedIds: saved.setSavedIds,
      setLiveSearchQuery: filters.setLiveSearchQuery,
      setLiveSearchDraft: filters.setLiveSearchDraft,
      setSearchRadiusMiles: location.setSearchRadiusMiles,
      setSavedLocations: location.setSavedLocations,
      setUserLocation: location.setUserLocation,
      setLocationStatus: location.setLocationStatus,
    }),
    [
      filters.setActiveLayer,
      filters.setLiveSearchDraft,
      filters.setLiveSearchQuery,
      filters.setPriceFilter,
      filters.setPulseFilter,
      filters.setSavedOnly,
      filters.setSortMode,
      filters.setSubcategoryFilter,
      filters.setVibeFilter,
      location.setLocationStatus,
      location.setSavedLocations,
      location.setSearchRadiusMiles,
      location.setUserLocation,
      saved.setSavedIds,
    ],
  );

  const { preferencesReady } = useUserPreferences({
    authReady: auth.authReady,
    currentUser: auth.currentUser,
    preferences,
    setters: preferenceSetters,
    requestBrowserLocation: location.requestBrowserLocation,
    setActionStatus,
  });

  const reviews = useReviews({
    currentUser: auth.currentUser,
    selectedPlace: selected.selectedPlace,
    setActionStatus,
  });

  const planTitle = useMemo(
    () =>
      getPlanTitle({
        activeCity,
        userLocation: location.userLocation,
        activeLayer: filters.activeLayer,
      }),
    [activeCity, filters.activeLayer, location.userLocation],
  );

  const exports = usePlaceExports({
    filters: filters.filters,
    title: planTitle,
    source: liveStatus.source,
    exportPlaces,
    setActionStatus,
  });

  const sharing = usePlaceSharing({
    selectedPlace: selected.selectedPlace,
    liveSearchQuery: filters.liveSearchQuery,
    userLocation: location.userLocation,
    setActiveCity,
    setActionStatus,
  });

  const placesAreRefreshing = Boolean(googleApiKey && googleMapAvailable && liveStatus.loading);
  const placesLoadingLabel = filters.effectiveLiveSearchQuery
    ? `Loading "${filters.effectiveLiveSearchQuery}"`
    : "Refreshing live places";

  const runQuickSearch = useCallback(
    (search: string) => {
      filters.setQuery(search);
      setPaletteOpen(false);
    },
    [filters],
  );

  const handleGoogleMapUnavailable = useCallback((message: string) => {
    setGoogleMapAvailable(false);
    setLivePlaces([]);
    setActionStatus(message);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }

      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!actionStatus) return;

    const timeoutId = window.setTimeout(() => setActionStatus(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [actionStatus]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!visiblePlaces.length) return;

    window.requestAnimationFrame(() => {
      resultListRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [filters.filterSignature, visiblePlaces.length]);

  return (
    <main className="app-shell">
      <TopBar
        activeCity={activeCity}
        userLocation={location.userLocation}
        savedLocations={location.savedLocations}
        locationDraft={location.locationDraft}
        locationStatus={location.locationStatus}
        findingLocation={location.findingLocation}
        searchRadiusMiles={location.searchRadiusMiles}
        onLocationDraftChange={location.setLocationDraft}
        onRadiusChange={location.setSearchRadiusMiles}
        onFindLocation={location.findCityLocation}
        onSaveLocation={location.saveActiveLocation}
        onSelectSavedLocation={location.selectSavedLocation}
        onUseCurrentLocation={() => location.requestBrowserLocation(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <section className="workspace">
        <Sidebar
          activeLayer={filters.activeLayer}
          activeCity={activeCity}
          allPlaces={allPlaces}
          selectedPlace={selected.selectedPlace}
          savedPlaces={savedPlaces}
          layerCounts={layerCounts}
          availableVibes={availableVibes}
          priceFilter={filters.priceFilter}
          subcategoryFilter={filters.subcategoryFilter}
          subcategoryOptions={filters.subcategoryOptions}
          vibeFilter={filters.vibeFilter}
          pulseFilter={filters.pulseFilter}
          sortMode={filters.sortMode}
          savedOnly={filters.savedOnly}
          currentUser={auth.currentUser}
          authBusy={auth.authBusy}
          firebaseConfigured={isFirebaseConfigured}
          preferencesReady={preferencesReady}
          onSignIn={auth.handleGoogleSignIn}
          onSignOut={auth.handleSignOut}
          onLayerChange={filters.handleLayerChange}
          onSubcategoryChange={filters.setSubcategoryFilter}
          onPriceChange={filters.setPriceFilter}
          onVibeChange={filters.setVibeFilter}
          onPulseChange={filters.setPulseFilter}
          onSortChange={filters.setSortMode}
          onSavedOnlyChange={filters.setSavedOnly}
          onResetFilters={filters.resetFilters}
          onPickSavedPlace={sharing.openSavedPlaceInGoogleMaps}
        />

        <section className="map-stage" aria-label="Interactive LifeLayers map">
          <MapToolbar
            visibleCount={visiblePlaces.length}
            compareMode={compareMode}
            hasSelectedPlace={Boolean(selected.selectedPlace)}
            hasExportPlaces={Boolean(exportPlaces.length)}
            actionStatus={actionStatus}
            onToggleCompare={() => setCompareMode((current) => !current)}
            onShare={sharing.sharePlan}
            onExportCsv={exports.exportCsv}
            onExportJson={exports.exportJson}
          />

          <PresetRow
            presets={planPresets}
            activePresetLabel={filters.activePresetLabel}
            onApplyPreset={filters.applyPreset}
          />

          <ActiveFilterBar
            chips={filters.activeFilterChips}
            activePresetLabel={filters.activePresetLabel}
            resultCount={visiblePlaces.length}
            loading={placesAreRefreshing}
            loadingLabel={placesLoadingLabel}
            onResetFilters={filters.resetFilters}
          />

          <div className="map-utility-row">
            <LiveSourceBar status={liveStatus} />

            <LiveGoogleSearch
              value={filters.liveSearchDraft}
              activeQuery={filters.liveSearchQuery}
              disabled={!googleApiKey}
              onChange={filters.setLiveSearchDraft}
              onSubmit={filters.runLiveGoogleSearch}
              onClear={filters.clearLiveGoogleSearch}
            />
          </div>

          <div className="discovery-layout">
            {googleApiKey && googleMapAvailable ? (
              <GoogleLiveMap
                apiKey={googleApiKey}
                mapId={googleMapId}
                activeCity={activeCity}
                activeLayer={filters.activeLayer}
                liveSearchQuery={filters.effectiveLiveSearchQuery}
                places={visiblePlaces}
                selectedPlace={selected.selectedPlace}
                userLocation={location.userLocation}
                searchRadiusMiles={location.searchRadiusMiles}
                onViewportChange={location.handleMapViewportChange}
                onPickPlace={(place) => selected.setSelectedId(place.id)}
                onLivePlaces={setLivePlaces}
                onStatus={setLiveStatus}
                onUnavailable={handleGoogleMapUnavailable}
              />
            ) : (
              <RealMap
                activeCity={activeCity}
                neighborhoods={activeNeighborhoods}
                places={visiblePlaces}
                selectedPlace={selected.selectedPlace}
                userLocation={location.userLocation}
                searchRadiusMiles={location.searchRadiusMiles}
                onPickNeighborhood={(neighborhood) => filters.setQuery(neighborhood.name)}
                onPickPlace={(place) => selected.setSelectedId(place.id)}
              />
            )}

            <ResultsBoard
              places={visiblePlaces}
              selectedId={selected.selectedPlace.id}
              savedIds={saved.savedIds}
              resultListRef={resultListRef}
              loading={placesAreRefreshing}
              loadingLabel={placesLoadingLabel}
              onPick={(place) => selected.setSelectedId(place.id)}
              onSave={(place) => saved.toggleSaved(place.id)}
            />
          </div>

          <div className="neighborhood-strip">
            {topNeighborhoods.map((neighborhood) => (
              <NeighborhoodCard key={neighborhood.id} neighborhood={neighborhood} />
            ))}
          </div>
        </section>

        <aside className="detail-panel" aria-label="Selected place details">
          <PlaceDetail
            place={selected.selectedPlace}
            isSaved={saved.savedIds.includes(selected.selectedPlace.id)}
            onSave={() => saved.toggleSaved(selected.selectedPlace.id)}
            onCityClick={() => sharing.keepLocationMode(selected.selectedPlace)}
            currentUser={auth.currentUser}
            firebaseConfigured={isFirebaseConfigured}
            reviewRating={reviews.reviewRating}
            reviewText={reviews.reviewText}
            reviewStatus={
              reviews.reviewStatus?.placeId === selected.selectedPlace.id
                ? reviews.reviewStatus.message
                : ""
            }
            onReviewRatingChange={reviews.setReviewRating}
            onReviewTextChange={reviews.setReviewText}
            onSubmitReview={reviews.submitReview}
            onRequestSignIn={auth.handleGoogleSignIn}
          />
        </aside>
      </section>

      <section className="mobile-sheet" aria-label="Selected place">
        <PlaceDetail
          place={selected.selectedPlace}
          isSaved={saved.savedIds.includes(selected.selectedPlace.id)}
          onSave={() => saved.toggleSaved(selected.selectedPlace.id)}
          onCityClick={() => sharing.keepLocationMode(selected.selectedPlace)}
          currentUser={auth.currentUser}
          firebaseConfigured={isFirebaseConfigured}
          reviewRating={reviews.reviewRating}
          reviewText={reviews.reviewText}
          reviewStatus={
            reviews.reviewStatus?.placeId === selected.selectedPlace.id
              ? reviews.reviewStatus.message
              : ""
          }
          onReviewRatingChange={reviews.setReviewRating}
          onReviewTextChange={reviews.setReviewText}
          onSubmitReview={reviews.submitReview}
          onRequestSignIn={auth.handleGoogleSignIn}
        />
      </section>

      {paletteOpen && (
        <CommandPalette
          query={filters.query}
          places={allPlaces}
          onQueryChange={filters.setQuery}
          onClose={() => setPaletteOpen(false)}
          onPickPlace={(place) => {
            selected.setSelectedId(place.id);
            sharing.keepLocationMode(place);
            setPaletteOpen(false);
          }}
          onQuickSearch={runQuickSearch}
        />
      )}
    </main>
  );
}

export default App;
