import { useCallback } from "react";
import type { Place } from "../data/places";
import { downloadFile, type LiveStatus } from "../lib/lifelayers";
import {
  buildCsvExportContent,
  buildJsonExportPayload,
  type PlaceFilterState,
} from "../utils/placeState";

export function usePlaceExports({
  filters,
  title,
  source,
  exportPlaces,
  setActionStatus,
}: {
  filters: PlaceFilterState;
  title: string;
  source: LiveStatus["source"];
  exportPlaces: Place[];
  setActionStatus: (message: string) => void;
}) {
  const exportJson = useCallback(() => {
    const payload = buildJsonExportPayload({
      ...filters,
      title,
      source,
      places: exportPlaces,
    });

    downloadFile("lifelayers-export.json", JSON.stringify(payload, null, 2), "application/json");
    setActionStatus(`Exported ${exportPlaces.length} places as JSON.`);
  }, [exportPlaces, filters, setActionStatus, source, title]);

  const exportCsv = useCallback(() => {
    downloadFile("lifelayers-export.csv", buildCsvExportContent(exportPlaces), "text/csv");
    setActionStatus(`Exported ${exportPlaces.length} places as CSV.`);
  }, [exportPlaces, setActionStatus]);

  return {
    exportJson,
    exportCsv,
  };
}
