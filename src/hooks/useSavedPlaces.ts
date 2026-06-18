import { useCallback, useState } from "react";
import { toggleSavedId } from "../utils/placeState";

export function useSavedPlaces() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const toggleSaved = useCallback((placeId: string) => {
    setSavedIds((current) => toggleSavedId(current, placeId));
  }, []);

  return {
    savedIds,
    setSavedIds,
    toggleSaved,
  };
}
