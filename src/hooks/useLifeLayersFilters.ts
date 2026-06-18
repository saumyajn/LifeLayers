import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CityId, LayerId } from "../data/places";
import { layers } from "../data/places";
import type { ActiveFilterChip } from "../components/DiscoveryPanels";
import {
  getActivePresetLabel,
  getFilterSignature,
  getSubcategoryOptions,
  type PlaceFilterState,
} from "../utils/placeState";
import {
  priceOptions,
  pulseOptions,
  sortOptions,
  type PlanPreset,
  type PriceFilter,
  type PulseFilter,
  type SortMode,
  type SubcategoryFilter,
  type UserLocation,
} from "../lib/lifelayers";

export function useLifeLayersFilters({
  activeCity,
  setActiveCity,
  userLocation,
  searchRadiusMiles,
}: {
  activeCity: CityId;
  setActiveCity: Dispatch<SetStateAction<CityId>>;
  userLocation: UserLocation | null;
  searchRadiusMiles: number;
}) {
  const [activeLayer, setActiveLayer] = useState<LayerId | "all">("all");
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [vibeFilter, setVibeFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<SubcategoryFilter>("all");
  const [pulseFilter, setPulseFilter] = useState<PulseFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("signal");
  const [savedOnly, setSavedOnly] = useState(false);
  const [liveSearchDraft, setLiveSearchDraft] = useState("");
  const [liveSearchQuery, setLiveSearchQuery] = useState("");

  const subcategoryOptions = useMemo(() => getSubcategoryOptions(activeLayer), [activeLayer]);
  const activeSubcategory = useMemo(
    () => subcategoryOptions.find((option) => option.id === subcategoryFilter),
    [subcategoryFilter, subcategoryOptions],
  );
  const effectiveLiveSearchQuery = liveSearchQuery || activeSubcategory?.liveQuery || "";

  const filters = useMemo<PlaceFilterState>(
    () => ({
      activeCity,
      activeLayer,
      priceFilter,
      vibeFilter,
      pulseFilter,
      subcategoryFilter,
      sortMode,
      savedOnly,
      query,
      liveSearchQuery,
    }),
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

  const clearFilter = useCallback(
    (filterId: string) => {
      switch (filterId) {
        case "city":
          setActiveCity(userLocation ? "nearby" : "all");
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
    },
    [setActiveCity, userLocation],
  );

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    const cityLabel =
      activeCity === "nearby" && userLocation
        ? userLocation.label
        : activeCity === "nearby"
          ? "Near me"
          : "Current area";
    const layerLabel = layers.find((layer) => layer.id === activeLayer)?.label;
    const priceLabel = priceOptions.find((price) => price.id === priceFilter)?.label;
    const pulseLabel = pulseOptions.find((pulse) => pulse.id === pulseFilter)?.label;
    const sortLabel = sortOptions.find((sort) => sort.id === sortMode)?.label;

    if (activeCity !== "all" && cityLabel) {
      chips.push({
        id: "city",
        label: `Location: ${cityLabel}`,
        onClear: () => clearFilter("city"),
      });
      chips.push({
        id: "radius",
        label: `Distance: ${searchRadiusMiles} mi`,
      });
    }
    if (activeLayer !== "all" && layerLabel) {
      chips.push({
        id: "layer",
        label: `Layer: ${layerLabel}`,
        onClear: () => clearFilter("layer"),
      });
    }
    if (priceFilter !== "all" && priceLabel) {
      chips.push({
        id: "price",
        label: `Price: ${priceLabel}`,
        onClear: () => clearFilter("price"),
      });
    }
    if (activeSubcategory) {
      chips.push({
        id: "subcategory",
        label: `Option: ${activeSubcategory.label}`,
        onClear: () => clearFilter("subcategory"),
      });
    }
    if (vibeFilter !== "all") {
      chips.push({
        id: "vibe",
        label: `Vibe: ${vibeFilter}`,
        onClear: () => clearFilter("vibe"),
      });
    }
    if (pulseFilter !== "all" && pulseLabel) {
      chips.push({
        id: "pulse",
        label: `Pulse: ${pulseLabel}`,
        onClear: () => clearFilter("pulse"),
      });
    }
    if (query) {
      chips.push({ id: "query", label: `Search: ${query}`, onClear: () => clearFilter("query") });
    }
    if (liveSearchQuery) {
      chips.push({
        id: "live",
        label: `Live: ${liveSearchQuery}`,
        onClear: () => clearFilter("live"),
      });
    }
    if (savedOnly) {
      chips.push({ id: "saved", label: "Saved only", onClear: () => clearFilter("saved") });
    }
    if (sortMode !== "signal" && sortLabel) {
      chips.push({ id: "sort", label: `Sort: ${sortLabel}`, onClear: () => clearFilter("sort") });
    }

    return chips;
  }, [
    activeCity,
    activeLayer,
    activeSubcategory,
    clearFilter,
    liveSearchQuery,
    priceFilter,
    pulseFilter,
    query,
    savedOnly,
    searchRadiusMiles,
    sortMode,
    userLocation,
    vibeFilter,
  ]);

  useEffect(() => {
    if (subcategoryFilter === "all") return;
    if (subcategoryOptions.some((option) => option.id === subcategoryFilter)) return;
    setSubcategoryFilter("all");
  }, [subcategoryFilter, subcategoryOptions]);

  const activePresetLabel = useMemo(() => getActivePresetLabel(filters), [filters]);
  const filterSignature = useMemo(
    () =>
      getFilterSignature({
        ...filters,
        userLocation,
        searchRadiusMiles,
        activeSubcategory,
      }),
    [activeSubcategory, filters, searchRadiusMiles, userLocation],
  );

  const resetFilters = useCallback(() => {
    setActiveCity(userLocation ? "nearby" : "all");
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
  }, [setActiveCity, userLocation]);

  const applyPreset = useCallback((preset: PlanPreset) => {
    setQuery(preset.query);
    setActiveLayer(preset.layer);
    setSubcategoryFilter("all");
    setPriceFilter(preset.price);
    setPulseFilter("all");
    setVibeFilter("all");
    setSavedOnly(false);
    setLiveSearchDraft("");
    setLiveSearchQuery("");
  }, []);

  const handleLayerChange = useCallback((layer: LayerId | "all") => {
    setActiveLayer(layer);
    setSubcategoryFilter("all");
  }, []);

  const runLiveGoogleSearch = useCallback(() => {
    setLiveSearchQuery(liveSearchDraft.trim());
    setQuery("");
    setSavedOnly(false);
  }, [liveSearchDraft]);

  const clearLiveGoogleSearch = useCallback(() => {
    setLiveSearchDraft("");
    setLiveSearchQuery("");
  }, []);

  return {
    activeLayer,
    setActiveLayer,
    activeCity,
    setActiveCity,
    query,
    setQuery,
    priceFilter,
    setPriceFilter,
    vibeFilter,
    setVibeFilter,
    subcategoryFilter,
    setSubcategoryFilter,
    pulseFilter,
    setPulseFilter,
    sortMode,
    setSortMode,
    savedOnly,
    setSavedOnly,
    liveSearchDraft,
    setLiveSearchDraft,
    liveSearchQuery,
    setLiveSearchQuery,
    filters,
    subcategoryOptions,
    activeSubcategory,
    effectiveLiveSearchQuery,
    activeFilterChips,
    activePresetLabel,
    filterSignature,
    resetFilters,
    applyPreset,
    handleLayerChange,
    runLiveGoogleSearch,
    clearLiveGoogleSearch,
  };
}
