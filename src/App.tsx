import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CityId, LayerId, Place, layers, neighborhoods, places } from "./data/places";
import { CommandPalette } from "./components/CommandPalette";
import {
  ActiveFilterBar,
  type ActiveFilterChip,
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
import {
  addUserReview,
  isFirebaseConfigured,
  listenForUser,
  loadUserPreferences,
  saveUserPreferences,
  signInWithGoogle,
  signOutUser,
  type LifeLayersUser,
  type UserPreferences,
} from "./firebase";
import {
  cityMatches,
  cityOptions,
  csvEscape,
  downloadFile,
  filterMatches,
  getCityId,
  getErrorMessage,
  getGoogleMapsUrl,
  isCityPreference,
  isLayerPreference,
  isPricePreference,
  isPulsePreference,
  isSortPreference,
  layerSubcategoryOptions,
  layerMatches,
  planPresets,
  priceOptions,
  pulseOptions,
  sortPlaces,
  sortOptions,
  subcategoryMatches,
  textMatches,
  toExportPlace,
  type LiveStatus,
  type PriceFilter,
  type PulseFilter,
  type ReviewStatus,
  type SortMode,
  type SubcategoryFilter,
} from "./lib/lifelayers";

const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function App() {
  const [activeLayer, setActiveLayer] = useState<LayerId | "all">("all");
  const [activeCity, setActiveCity] = useState<CityId>("all");
  const [selectedId, setSelectedId] = useState(places[0].id);
  const [query, setQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [vibeFilter, setVibeFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<SubcategoryFilter>("all");
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("signal");
  const [savedOnly, setSavedOnly] = useState(false);
  const [liveSearchDraft, setLiveSearchDraft] = useState("");
  const [liveSearchQuery, setLiveSearchQuery] = useState("");
  const [livePlaces, setLivePlaces] = useState<Place[]>([]);
  const [actionStatus, setActionStatus] = useState("");
  const [googleMapAvailable, setGoogleMapAvailable] = useState(Boolean(googleApiKey));
  const [currentUser, setCurrentUser] = useState<LifeLayersUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(!isFirebaseConfigured);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({
    source: googleApiKey ? "google" : "curated",
    message: googleApiKey
      ? "Google Maps enabled. Loading live Places results..."
      : "Add VITE_GOOGLE_MAPS_API_KEY to enable live Google Maps and Places.",
    count: 0,
    loading: Boolean(googleApiKey),
  });
  const restoredUserRef = useRef<string | null>(null);
  const resultListRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);

  const allPlaces = useMemo(() => {
    if (!googleApiKey || livePlaces.length === 0) return places;

    return [...places, ...livePlaces];
  }, [livePlaces]);

  const subcategoryOptions =
    activeLayer === "all" ? [] : layerSubcategoryOptions[activeLayer] ?? [];
  const activeSubcategory = subcategoryOptions.find((option) => option.id === subcategoryFilter);
  const effectiveLiveSearchQuery = liveSearchQuery || activeSubcategory?.liveQuery || "";
  const placesAreRefreshing = Boolean(googleApiKey && googleMapAvailable && liveStatus.loading);
  const placesLoadingLabel = effectiveLiveSearchQuery
    ? `Loading "${effectiveLiveSearchQuery}"`
    : "Refreshing live places";

  const visiblePlaces = useMemo(
    () =>
      allPlaces
        .filter(
          (place) =>
            cityMatches(place, activeCity) &&
            layerMatches(place, activeLayer) &&
            filterMatches(place, priceFilter, vibeFilter, pulseFilter) &&
            subcategoryMatches(place, activeSubcategory) &&
            (!savedOnly || savedIds.includes(place.id)) &&
            (!query || textMatches(place, query)),
        )
        .sort((a, b) => sortPlaces(a, b, sortMode)),
    [
      allPlaces,
      activeCity,
      activeLayer,
      activeSubcategory,
      priceFilter,
      vibeFilter,
      pulseFilter,
      savedOnly,
      savedIds,
      query,
      sortMode,
    ],
  );

  const layerCounts = useMemo(() => {
    const counts: Record<LayerId, number> = {
      eat: 0,
      do: 0,
      reddit: 0,
      memory: 0,
      vibe: 0,
    };

    allPlaces.forEach((place) => {
      if (
        cityMatches(place, activeCity) &&
        filterMatches(place, priceFilter, vibeFilter, pulseFilter)
      ) {
        counts[place.layer] += 1;
      }
    });

    return counts;
  }, [allPlaces, activeCity, priceFilter, vibeFilter, pulseFilter]);

  const availableVibes = useMemo(() => {
    const vibeSet = new Set<string>();
    allPlaces
      .filter((place) => cityMatches(place, activeCity))
      .forEach((place) => {
        place.vibe.forEach((vibe) => vibeSet.add(vibe));
        place.bestFor.forEach((tag) => vibeSet.add(tag));
      });

    return ["all", ...Array.from(vibeSet).sort()].slice(0, 28);
  }, [allPlaces, activeCity]);

  const selectedPlace =
    allPlaces.find((place) => place.id === selectedId) ?? visiblePlaces[0] ?? allPlaces[0];

  const activeNeighborhoods = neighborhoods.filter((neighborhood) => {
    if (activeCity === "all") return true;
    return activeCity === "nyc"
      ? neighborhood.city === "NYC"
      : neighborhood.city === "Jersey City";
  });

  const savedPlaces = savedIds
    .map((id) => allPlaces.find((place) => place.id === id))
    .filter((place): place is Place => Boolean(place));

  const exportPlaces = savedPlaces.length ? savedPlaces : visiblePlaces;

  const preferences = useMemo<UserPreferences>(
    () => ({
      activeLayer,
      activeCity,
      priceFilter,
      vibeFilter,
      subcategoryFilter,
      pulseFilter,
      sortMode,
      savedOnly,
      savedIds,
      liveSearchQuery,
    }),
    [
      activeLayer,
      activeCity,
      priceFilter,
      vibeFilter,
      subcategoryFilter,
      pulseFilter,
      sortMode,
      savedOnly,
      savedIds,
      liveSearchQuery,
    ],
  );

  const topNeighborhoods = [...activeNeighborhoods]
    .sort((a, b) => b.score - a.score)
    .slice(0, compareMode ? 4 : 3);

  const activePresetLabel = useMemo(() => {
    const matchingPreset = planPresets.find(
      (preset) =>
        preset.query === query &&
        preset.layer === activeLayer &&
        preset.price === priceFilter &&
        pulseFilter === "all" &&
        vibeFilter === "all" &&
        subcategoryFilter === "all" &&
        !savedOnly &&
        !liveSearchQuery,
    );

    return matchingPreset?.label;
  }, [
    activeLayer,
    liveSearchQuery,
    priceFilter,
    pulseFilter,
    query,
    savedOnly,
    subcategoryFilter,
    vibeFilter,
  ]);

  function clearFilter(filterId: string) {
    switch (filterId) {
      case "city":
        setActiveCity("all");
        break;
      case "layer":
        setActiveLayer("all");
        setSubcategoryFilter("all");
        break;
      case "subcategory":
        setSubcategoryFilter("all");
        break;
      case "price":
        setPriceFilter("all");
        break;
      case "vibe":
        setVibeFilter("all");
        break;
      case "pulse":
        setPulseFilter("all");
        break;
      case "query":
        setQuery("");
        break;
      case "live":
        setLiveSearchQuery("");
        setLiveSearchDraft("");
        break;
      case "saved":
        setSavedOnly(false);
        break;
      case "sort":
        setSortMode("signal");
        break;
      default:
        break;
    }
  }

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    const cityLabel = cityOptions.find((city) => city.id === activeCity)?.label;
    const layerLabel = layers.find((layer) => layer.id === activeLayer)?.label;
    const priceLabel = priceOptions.find((price) => price.id === priceFilter)?.label;
    const pulseLabel = pulseOptions.find((pulse) => pulse.id === pulseFilter)?.label;
    const sortLabel = sortOptions.find((sort) => sort.id === sortMode)?.label;

    if (activeCity !== "all" && cityLabel) chips.push({ id: "city", label: `City: ${cityLabel}`, onClear: () => clearFilter("city") });
    if (activeLayer !== "all" && layerLabel) chips.push({ id: "layer", label: `Layer: ${layerLabel}`, onClear: () => clearFilter("layer") });
    if (priceFilter !== "all" && priceLabel) chips.push({ id: "price", label: `Price: ${priceLabel}`, onClear: () => clearFilter("price") });
    if (activeSubcategory) chips.push({ id: "subcategory", label: `Option: ${activeSubcategory.label}`, onClear: () => clearFilter("subcategory") });
    if (vibeFilter !== "all") chips.push({ id: "vibe", label: `Vibe: ${vibeFilter}`, onClear: () => clearFilter("vibe") });
    if (pulseFilter !== "all" && pulseLabel) chips.push({ id: "pulse", label: `Pulse: ${pulseLabel}`, onClear: () => clearFilter("pulse") });
    if (query) chips.push({ id: "query", label: `Search: ${query}`, onClear: () => clearFilter("query") });
    if (liveSearchQuery) chips.push({ id: "live", label: `Live: ${liveSearchQuery}`, onClear: () => clearFilter("live") });
    if (savedOnly) chips.push({ id: "saved", label: "Saved only", onClear: () => clearFilter("saved") });
    if (sortMode !== "signal" && sortLabel) chips.push({ id: "sort", label: `Sort: ${sortLabel}`, onClear: () => clearFilter("sort") });

    return chips;
  }, [
    activeCity,
    activeLayer,
    activeSubcategory,
    liveSearchQuery,
    priceFilter,
    pulseFilter,
    query,
    savedOnly,
    sortMode,
    vibeFilter,
  ]);

  const filterSignature = useMemo(
    () =>
      [
        activeCity,
        activeLayer,
        priceFilter,
        subcategoryFilter,
        vibeFilter,
        pulseFilter,
        sortMode,
        savedOnly ? "saved" : "all",
        query,
        liveSearchQuery,
      ].join("|"),
    [
      activeCity,
      activeLayer,
      liveSearchQuery,
      priceFilter,
      pulseFilter,
      query,
      savedOnly,
      sortMode,
      subcategoryFilter,
      vibeFilter,
    ],
  );

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

  useEffect(
    () =>
      listenForUser((user) => {
        setCurrentUser(user);

        if (!user) {
          restoredUserRef.current = null;
          setPreferencesReady(!isFirebaseConfigured);
          return;
        }

        if (restoredUserRef.current === user.uid) {
          setPreferencesReady(true);
          return;
        }

        setPreferencesReady(false);

        loadUserPreferences(user.uid)
          .then((storedPreferences) => {
            if (!storedPreferences) return;

            if (isLayerPreference(storedPreferences.activeLayer)) {
              setActiveLayer(storedPreferences.activeLayer);
            }
            if (isCityPreference(storedPreferences.activeCity)) {
              setActiveCity(storedPreferences.activeCity);
            }
            if (isPricePreference(storedPreferences.priceFilter)) {
              setPriceFilter(storedPreferences.priceFilter);
            }
            if (typeof storedPreferences.vibeFilter === "string") {
              setVibeFilter(storedPreferences.vibeFilter);
            }
            if (typeof storedPreferences.subcategoryFilter === "string") {
              setSubcategoryFilter(storedPreferences.subcategoryFilter);
            }
            if (isPulsePreference(storedPreferences.pulseFilter)) {
              setPulseFilter(storedPreferences.pulseFilter);
            }
            if (isSortPreference(storedPreferences.sortMode)) {
              setSortMode(storedPreferences.sortMode);
            }
            if (typeof storedPreferences.savedOnly === "boolean") {
              setSavedOnly(storedPreferences.savedOnly);
            }
            if (Array.isArray(storedPreferences.savedIds)) {
              setSavedIds(storedPreferences.savedIds.filter((id) => typeof id === "string"));
            }
            if (typeof storedPreferences.liveSearchQuery === "string") {
              setLiveSearchQuery(storedPreferences.liveSearchQuery);
              setLiveSearchDraft(storedPreferences.liveSearchQuery);
            }

            setActionStatus("Your saved LifeLayers setup is loaded.");
          })
          .catch((error) => setActionStatus(getErrorMessage(error)))
          .finally(() => {
            restoredUserRef.current = user.uid;
            setPreferencesReady(true);
          });
      }),
    [],
  );

  useEffect(() => {
    if (!currentUser || !preferencesReady || !isFirebaseConfigured) return;

    const timeoutId = window.setTimeout(() => {
      saveUserPreferences(currentUser, preferences).catch((error) =>
        setActionStatus(getErrorMessage(error)),
      );
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [currentUser, preferences, preferencesReady]);

  useEffect(() => {
    const placeId = new URLSearchParams(window.location.search).get("place");
    if (!placeId || selectedId === placeId) return;
    if (allPlaces.some((place) => place.id === placeId)) {
      setSelectedId(placeId);
    }
  }, [allPlaces, selectedId]);

  useEffect(() => {
    if (visiblePlaces.length && !visiblePlaces.some((place) => place.id === selectedId)) {
      setSelectedId(visiblePlaces[0].id);
    }
  }, [selectedId, visiblePlaces]);

  useEffect(() => {
    if (!actionStatus) return;

    const timeoutId = window.setTimeout(() => setActionStatus(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [actionStatus]);

  useEffect(() => {
    if (subcategoryFilter === "all") return;
    if (subcategoryOptions.some((option) => option.id === subcategoryFilter)) return;
    setSubcategoryFilter("all");
  }, [subcategoryFilter, subcategoryOptions]);

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
  }, [filterSignature, visiblePlaces.length]);

  const toggleSaved = (placeId: string) => {
    setSavedIds((current) =>
      current.includes(placeId)
        ? current.filter((id) => id !== placeId)
        : [...current, placeId],
    );
  };

  const runQuickSearch = (search: string) => {
    setQuery(search);
    setPaletteOpen(false);
  };

  const resetFilters = () => {
    setActiveCity("all");
    setActiveLayer("all");
    setSubcategoryFilter("all");
    setPriceFilter("all");
    setVibeFilter("all");
    setPulseFilter("all");
    setSavedOnly(false);
    setQuery("");
    setLiveSearchDraft("");
    setLiveSearchQuery("");
    setSortMode("signal");
  };

  const applyPreset = (preset: (typeof planPresets)[number]) => {
    setQuery(preset.query);
    setActiveLayer(preset.layer);
    setSubcategoryFilter("all");
    setPriceFilter(preset.price);
    setPulseFilter("all");
    setVibeFilter("all");
    setSavedOnly(false);
    setLiveSearchDraft("");
    setLiveSearchQuery("");
  };

  const handleLayerChange = (layer: LayerId | "all") => {
    setActiveLayer(layer);
    setSubcategoryFilter("all");
  };

  const runLiveGoogleSearch = () => {
    setLiveSearchQuery(liveSearchDraft.trim());
    setQuery("");
    setSavedOnly(false);
  };

  const clearLiveGoogleSearch = () => {
    setLiveSearchDraft("");
    setLiveSearchQuery("");
  };

  const openSavedPlaceInGoogleMaps = (place: Place) => {
    const openedWindow = window.open(getGoogleMapsUrl(place), "_blank", "noopener,noreferrer");
    if (openedWindow) {
      openedWindow.opener = null;
      setActionStatus(`Opening ${place.name} in Google Maps.`);
      return;
    }

    setActionStatus("Allow popups to open saved places in Google Maps.");
  };

  const handleGoogleMapUnavailable = useCallback((message: string) => {
    setGoogleMapAvailable(false);
    setLivePlaces([]);
    setActionStatus(message);
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
      setActionStatus("Add Firebase env values to enable Google login.");
      return;
    }

    setAuthBusy(true);
    try {
      await signInWithGoogle();
      setActionStatus("Signed in with Google.");
    } catch (error) {
      setActionStatus(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOutUser();
      setActionStatus("Signed out.");
    } catch (error) {
      setActionStatus(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const submitReview = async () => {
    if (!currentUser) {
      setReviewStatus({ placeId: selectedPlace.id, message: "Sign in with Google to save reviews." });
      return;
    }

    const trimmedReview = reviewText.trim();
    if (!trimmedReview) {
      setReviewStatus({ placeId: selectedPlace.id, message: "Add a short review before saving." });
      return;
    }

    setReviewStatus({ placeId: selectedPlace.id, message: "Saving review..." });

    try {
      await addUserReview({
        user: currentUser,
        place: selectedPlace,
        rating: reviewRating,
        text: trimmedReview,
      });
      setReviewText("");
      setReviewRating(5);
      setReviewStatus({ placeId: selectedPlace.id, message: "Review saved to LifeLayers." });
      setActionStatus("Your review was saved to Firestore.");
    } catch (error) {
      setReviewStatus({ placeId: selectedPlace.id, message: getErrorMessage(error) });
    }
  };

  const getPlanTitle = () => {
    const cityLabel = cityOptions.find((city) => city.id === activeCity)?.label ?? "NYC + JC";
    const layerLabel =
      activeLayer === "all"
        ? "all layers"
        : layers.find((layer) => layer.id === activeLayer)?.label.toLowerCase() ?? activeLayer;

    return `LifeLayers ${cityLabel} ${layerLabel} plan`;
  };

  const getPlaceShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("place", selectedPlace.id);
    return url.toString();
  };

  const buildShareText = () => {
    const score = selectedPlace.rating
      ? `${selectedPlace.rating.toFixed(1)} Google rating`
      : `${selectedPlace.signal}/100 LifeLayers signal`;

    return [
      `LifeLayers: ${selectedPlace.name}`,
      liveSearchQuery ? `Search: ${liveSearchQuery}` : null,
      `${selectedPlace.kind} - ${selectedPlace.price} - ${selectedPlace.neighborhood}, ${selectedPlace.city}`,
      score,
      selectedPlace.address,
      selectedPlace.summary,
      `Local tip: ${selectedPlace.localTip}`,
      getPlaceShareUrl(),
    ]
      .filter(Boolean)
      .join("\n");
  };

  const sharePlan = async () => {
    const title = `LifeLayers: ${selectedPlace.name}`;
    const text = buildShareText();
    const url = getPlaceShareUrl();

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setActionStatus(`${selectedPlace.name} shared.`);
        return;
      }

      await navigator.clipboard.writeText(text);
      setActionStatus(`${selectedPlace.name} copied to clipboard.`);
    } catch {
      setActionStatus("Share was cancelled or blocked.");
    }
  };

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      title: getPlanTitle(),
      filters: {
        city: activeCity,
        layer: activeLayer,
        price: priceFilter,
        vibe: vibeFilter,
        pulse: pulseFilter,
        subcategory: subcategoryFilter,
        sort: sortMode,
        savedOnly,
        query,
        liveSearchQuery,
      },
      source: liveStatus.source,
      places: exportPlaces.map(toExportPlace),
    };

    downloadFile("lifelayers-export.json", JSON.stringify(payload, null, 2), "application/json");
    setActionStatus(`Exported ${exportPlaces.length} places as JSON.`);
  };

  const exportCsv = () => {
    const headers = [
      "Name",
      "City",
      "Neighborhood",
      "Layer",
      "Kind",
      "Price",
      "Rating",
      "Reviews",
      "Signal",
      "Source",
      "Address",
      "Local Tip",
    ];

    const rows = exportPlaces.map((place) =>
      [
        place.name,
        place.city,
        place.neighborhood,
        place.layer,
        place.kind,
        place.price,
        place.rating,
        place.userRatingsTotal,
        place.signal,
        place.source,
        place.address,
        place.localTip,
      ]
        .map(csvEscape)
        .join(","),
    );

    downloadFile(
      "lifelayers-export.csv",
      [headers.map(csvEscape).join(","), ...rows].join("\n"),
      "text/csv",
    );
    setActionStatus(`Exported ${exportPlaces.length} places as CSV.`);
  };

  return (
    <main className="app-shell">
      <TopBar
        activeCity={activeCity}
        onCityChange={setActiveCity}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <section className="workspace">
        <Sidebar
          activeLayer={activeLayer}
          activeCity={activeCity}
          allPlaces={allPlaces}
          selectedPlace={selectedPlace}
          savedPlaces={savedPlaces}
          layerCounts={layerCounts}
          availableVibes={availableVibes}
          priceFilter={priceFilter}
          subcategoryFilter={subcategoryFilter}
          subcategoryOptions={subcategoryOptions}
          vibeFilter={vibeFilter}
          pulseFilter={pulseFilter}
          sortMode={sortMode}
          savedOnly={savedOnly}
          currentUser={currentUser}
          authBusy={authBusy}
          firebaseConfigured={isFirebaseConfigured}
          preferencesReady={preferencesReady}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onLayerChange={handleLayerChange}
          onSubcategoryChange={setSubcategoryFilter}
          onPriceChange={setPriceFilter}
          onVibeChange={setVibeFilter}
          onPulseChange={setPulseFilter}
          onSortChange={setSortMode}
          onSavedOnlyChange={setSavedOnly}
          onResetFilters={resetFilters}
          onPickSavedPlace={openSavedPlaceInGoogleMaps}
        />

        <section className="map-stage" aria-label="Interactive LifeLayers map">
          <MapToolbar
            visibleCount={visiblePlaces.length}
            compareMode={compareMode}
            hasSelectedPlace={Boolean(selectedPlace)}
            hasExportPlaces={Boolean(exportPlaces.length)}
            actionStatus={actionStatus}
            onToggleCompare={() => setCompareMode((current) => !current)}
            onShare={sharePlan}
            onExportCsv={exportCsv}
            onExportJson={exportJson}
          />

          <PresetRow
            presets={planPresets}
            activePresetLabel={activePresetLabel}
            onApplyPreset={applyPreset}
          />

          <ActiveFilterBar
            chips={activeFilterChips}
            activePresetLabel={activePresetLabel}
            resultCount={visiblePlaces.length}
            loading={placesAreRefreshing}
            loadingLabel={placesLoadingLabel}
            onResetFilters={resetFilters}
          />

          <div className="map-utility-row">
            <LiveSourceBar status={liveStatus} />

            <LiveGoogleSearch
              value={liveSearchDraft}
              activeQuery={liveSearchQuery}
              disabled={!googleApiKey}
              onChange={setLiveSearchDraft}
              onSubmit={runLiveGoogleSearch}
              onClear={clearLiveGoogleSearch}
            />
          </div>

          <div className="discovery-layout">
            {googleApiKey && googleMapAvailable ? (
              <GoogleLiveMap
                apiKey={googleApiKey}
                activeCity={activeCity}
                activeLayer={activeLayer}
                liveSearchQuery={effectiveLiveSearchQuery}
                places={visiblePlaces}
                selectedPlace={selectedPlace}
                onPickPlace={(place) => setSelectedId(place.id)}
                onLivePlaces={setLivePlaces}
                onStatus={setLiveStatus}
                onUnavailable={handleGoogleMapUnavailable}
              />
            ) : (
              <RealMap
                activeCity={activeCity}
                neighborhoods={activeNeighborhoods}
                places={visiblePlaces}
                selectedPlace={selectedPlace}
                onPickNeighborhood={(neighborhood) => setQuery(neighborhood.name)}
                onPickPlace={(place) => setSelectedId(place.id)}
              />
            )}

            <ResultsBoard
              places={visiblePlaces}
              selectedId={selectedPlace.id}
              savedIds={savedIds}
              resultListRef={resultListRef}
              loading={placesAreRefreshing}
              loadingLabel={placesLoadingLabel}
              onPick={(place) => setSelectedId(place.id)}
              onSave={(place) => toggleSaved(place.id)}
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
            place={selectedPlace}
            isSaved={savedIds.includes(selectedPlace.id)}
            onSave={() => toggleSaved(selectedPlace.id)}
            onCityClick={() => setActiveCity(getCityId(selectedPlace))}
            currentUser={currentUser}
            firebaseConfigured={isFirebaseConfigured}
            reviewRating={reviewRating}
            reviewText={reviewText}
            reviewStatus={reviewStatus?.placeId === selectedPlace.id ? reviewStatus.message : ""}
            onReviewRatingChange={setReviewRating}
            onReviewTextChange={setReviewText}
            onSubmitReview={submitReview}
            onRequestSignIn={handleGoogleSignIn}
          />
        </aside>
      </section>

      <section className="mobile-sheet" aria-label="Selected place">
        <PlaceDetail
          place={selectedPlace}
          isSaved={savedIds.includes(selectedPlace.id)}
          onSave={() => toggleSaved(selectedPlace.id)}
          onCityClick={() => setActiveCity(getCityId(selectedPlace))}
          currentUser={currentUser}
          firebaseConfigured={isFirebaseConfigured}
          reviewRating={reviewRating}
          reviewText={reviewText}
          reviewStatus={reviewStatus?.placeId === selectedPlace.id ? reviewStatus.message : ""}
          onReviewRatingChange={setReviewRating}
          onReviewTextChange={setReviewText}
          onSubmitReview={submitReview}
          onRequestSignIn={handleGoogleSignIn}
        />
      </section>

      {paletteOpen && (
        <CommandPalette
          query={query}
          places={allPlaces}
          onQueryChange={setQuery}
          onClose={() => setPaletteOpen(false)}
          onPickPlace={(place) => {
            setSelectedId(place.id);
            setActiveCity(getCityId(place));
            setPaletteOpen(false);
          }}
          onQuickSearch={runQuickSearch}
        />
      )}
    </main>
  );
}

export default App;
