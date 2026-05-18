import type {
  GroupedLogFieldId,
  LogsHistogramResponse,
  LogsResponse,
  LogsViewMode,
  LogsViewResponse,
} from "@/models";
import {
  GROUPED_LOG_FIELD_QUERY_PARAM,
  LOG_FIELD_QUERY_PARAM,
  LOGS_VIEW_QUERY_PARAM,
  type LogFieldId,
  normalizeVisibleGroupedLogFieldIds,
  normalizeVisibleLogFieldIds,
} from "@/models";

export function logsQueryKey(fieldIds: readonly LogFieldId[]) {
  return ["logs", fieldIds.join(",")] as const;
}

export function logsViewQueryKey(
  mode: LogsViewMode,
  fieldIds: readonly LogFieldId[],
  groupedFieldIds: readonly GroupedLogFieldId[],
) {
  return [
    "logs-view",
    mode,
    fieldIds.join(","),
    mode === "grouped" ? groupedFieldIds.join(",") : "",
  ] as const;
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

export function createLogsViewUrl(
  mode: LogsViewMode,
  fieldIds: readonly LogFieldId[],
  groupedFieldIds: readonly GroupedLogFieldId[],
): string {
  return createLogsResourceUrl("/api/logs/view", fieldIds, {
    mode,
    groupedFieldIds,
  });
}

function createLogsResourceUrl(
  pathname: "/api/logs" | "/api/logs/view",
  fieldIds: readonly LogFieldId[],
  options?: {
    mode?: LogsViewMode;
    groupedFieldIds?: readonly GroupedLogFieldId[];
  },
): string {
  const searchParams = new URLSearchParams();

  if (options?.mode && options.mode !== "logs") {
    searchParams.set(LOGS_VIEW_QUERY_PARAM, options.mode);
  }

  for (const fieldId of normalizeVisibleLogFieldIds(fieldIds)) {
    searchParams.append(LOG_FIELD_QUERY_PARAM, fieldId);
  }

  if (options?.mode === "grouped") {
    for (const fieldId of normalizeVisibleGroupedLogFieldIds(
      options.groupedFieldIds,
    )) {
      searchParams.append(GROUPED_LOG_FIELD_QUERY_PARAM, fieldId);
    }
  }

  return `${pathname}?${searchParams.toString()}`;
}

export async function fetchLogsView(
  mode: LogsViewMode,
  fieldIds: readonly LogFieldId[],
  groupedFieldIds: readonly GroupedLogFieldId[],
  signal?: AbortSignal,
): Promise<LogsViewResponse> {
  const response = await fetch(createLogsViewUrl(mode, fieldIds, groupedFieldIds), {
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
