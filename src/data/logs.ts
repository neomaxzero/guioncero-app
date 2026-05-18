import type { LogsHistogramResponse, LogsResponse } from "@/models";

export const logsQueryKey = ["logs"] as const;
export const logsHistogramQueryKey = ["logs-histogram"] as const;

export async function fetchLogs(signal?: AbortSignal): Promise<LogsResponse> {
  const response = await fetch("/api/logs", {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch logs.");
  }

  return (await response.json()) as LogsResponse;
}

export async function fetchLogsHistogram(
  signal?: AbortSignal,
): Promise<LogsHistogramResponse> {
  const response = await fetch("/api/logs/histogram", {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch logs histogram.");
  }

  return (await response.json()) as LogsHistogramResponse;
}
