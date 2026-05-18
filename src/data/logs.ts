import type { LogsHistogramResponse, LogsResponse, LogsViewResponse } from "@/models";
import {
  LOG_FIELD_QUERY_PARAM,
  type LogFieldId,
  normalizeVisibleLogFieldIds,
} from "@/models";

export function logsQueryKey(fieldIds: readonly LogFieldId[]) {
  return ["logs", fieldIds.join(",")] as const;
}

export function logsViewQueryKey(fieldIds: readonly LogFieldId[]) {
  return ["logs-view", fieldIds.join(",")] as const;
}

export const logsHistogramQueryKey = ["logs-histogram"] as const;

export async function fetchLogs(
  fieldIds: readonly LogFieldId[],
  signal?: AbortSignal,
): Promise<LogsResponse> {
  const response = await fetch(createLogsUrl(fieldIds), {
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

export function createLogsUrl(fieldIds: readonly LogFieldId[]): string {
  return createLogsResourceUrl("/api/logs", fieldIds);
}

export function createLogsViewUrl(fieldIds: readonly LogFieldId[]): string {
  return createLogsResourceUrl("/api/logs/view", fieldIds);
}

function createLogsResourceUrl(
  pathname: "/api/logs" | "/api/logs/view",
  fieldIds: readonly LogFieldId[],
): string {
  const searchParams = new URLSearchParams();

  for (const fieldId of normalizeVisibleLogFieldIds(fieldIds)) {
    searchParams.append(LOG_FIELD_QUERY_PARAM, fieldId);
  }

  return `${pathname}?${searchParams.toString()}`;
}

export async function fetchLogsView(
  fieldIds: readonly LogFieldId[],
  signal?: AbortSignal,
): Promise<LogsViewResponse> {
  const response = await fetch(createLogsViewUrl(fieldIds), {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch logs view.");
  }

  return (await response.json()) as LogsViewResponse;
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
