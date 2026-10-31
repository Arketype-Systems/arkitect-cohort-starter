import { useMemo } from "react";
import { createReportIndex } from "./report";
import type { useData } from "./useData";
export function useReports(data: ReturnType<typeof useData>) {
  return useMemo(
    () =>
      createReportIndex(
        data.sessions,
        data.measurements,
        data.standards,
        data.athletes,
        data.archetypes,
      ),
    [
      data.sessions,
      data.measurements,
      data.standards,
      data.athletes,
      data.archetypes,
    ],
  );
}
