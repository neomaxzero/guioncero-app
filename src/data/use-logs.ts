"use client";

import { useQuery } from "@tanstack/react-query";

import { useSettings } from "@/settings/use-settings";

import { fetchLogs, logsQueryKey } from "./logs";

export function useLogs() {
  const visibleLogFieldIds = useSettings((state) => state.visibleLogFieldIds);

  return useQuery({
    queryKey: logsQueryKey(visibleLogFieldIds),
    queryFn: ({ signal }) => fetchLogs(visibleLogFieldIds, signal),
  });
}
