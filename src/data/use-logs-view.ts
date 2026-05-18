"use client";

import { useQuery } from "@tanstack/react-query";

import { useSettings } from "@/settings/use-settings";

import { fetchLogsView, logsViewQueryKey } from "./logs";

export function useLogsView() {
  const logsViewMode = useSettings((state) => state.logsViewMode);
  const visibleLogFieldIds = useSettings((state) => state.visibleLogFieldIds);
  const visibleGroupedLogFieldIds = useSettings(
    (state) => state.visibleGroupedLogFieldIds,
  );

  return useQuery({
    queryKey: logsViewQueryKey(
      logsViewMode,
      visibleLogFieldIds,
      visibleGroupedLogFieldIds,
    ),
    queryFn: ({ signal }) =>
      fetchLogsView(
        logsViewMode,
        visibleLogFieldIds,
        visibleGroupedLogFieldIds,
        signal,
      ),
  });
}
