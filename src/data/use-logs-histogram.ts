"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchLogsHistogram, logsHistogramQueryKey } from "./logs";

export function useLogsHistogram() {
  return useQuery({
    queryKey: logsHistogramQueryKey,
    queryFn: ({ signal }) => fetchLogsHistogram(signal),
  });
}
