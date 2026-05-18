"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchLogs, logsQueryKey } from "./logs";

export function useLogs() {
  return useQuery({
    queryKey: logsQueryKey,
    queryFn: ({ signal }) => fetchLogs(signal),
  });
}
