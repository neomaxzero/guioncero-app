"use client";

import { useQuery } from "@tanstack/react-query";

import { useSettings } from "@/settings/use-settings";

import { fetchLogsView, logsViewQueryKey } from "./logs";

export function useLogsView() {
  const visibleLogFieldIds = useSettings((state) => state.visibleLogFieldIds);

  return useQuery({
    queryKey: logsViewQueryKey(visibleLogFieldIds),
    queryFn: ({ signal }) => fetchLogsView(visibleLogFieldIds, signal),
  });
}
