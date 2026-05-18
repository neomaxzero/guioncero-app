import type {
  IAnyValue,
  IKeyValue,
} from "@opentelemetry/otlp-transformer/build/src/common/internal-types";

import type {
  LogRecord,
  LogsHistogramBucket,
  LogsHistogramResponse,
  LogRow,
  LogsResponse,
  OtlpLogsResponse,
} from "@/models";
import { getSeverityTone } from "../../../lib/log-severity";

const UNKNOWN_TIME = "Unknown time";
const UNKNOWN_SERVICE = "unknown service";
const NO_MESSAGE = "No message";
const TARGET_MAX_BUCKETS = 40;
const DEFAULT_BUCKET_INTERVAL_MS = 60_000;
const BUCKET_INTERVALS_MS = [
  DEFAULT_BUCKET_INTERVAL_MS,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
] as const;

type FilterTarget = "resource" | "scopeAttributes" | "scopeName" | "log";

type Filter = {
  target: FilterTarget;
  key: string;
  values: Set<string>;
};

type IndexedLogRow = LogRow & {
  indexes: {
    resource: Record<string, string>;
    scopeAttributes: Record<string, string>;
    log: Record<string, string>;
    scopeName?: string;
    severity: string;
  };
};

export function createLogsResponse(
  otlpLogs: OtlpLogsResponse,
  searchParams: URLSearchParams,
): LogsResponse {
  const { filteredRows, total } = createFilteredRows(otlpLogs, searchParams);
  const sortedRows = sortRowsByTimeDesc(filteredRows);
  const limit = getLimit(searchParams);
  const limitedRows =
    limit === undefined ? sortedRows : sortedRows.slice(0, limit);

  return {
    rows: limitedRows.map(stripIndexes),
    total,
    filtered: sortedRows.length,
  };
}

export function createLogsHistogramResponse(
  otlpLogs: OtlpLogsResponse,
  searchParams: URLSearchParams,
): LogsHistogramResponse {
  const { filteredRows } = createFilteredRows(otlpLogs, searchParams);
  const timedRows = filteredRows
    .map((row) => ({
      row,
      milliseconds: unixNanoToMilliseconds(row.timeUnixNano),
    }))
    .filter(
      (
        item,
      ): item is {
        row: IndexedLogRow;
        milliseconds: number;
      } =>
        item.milliseconds !== undefined &&
        Number.isFinite(item.milliseconds) &&
        !Number.isNaN(new Date(item.milliseconds).getTime()),
    );

  if (timedRows.length === 0) {
    return {
      buckets: [],
      total: filteredRows.length,
    };
  }

  let fromMs = timedRows[0]?.milliseconds ?? 0;
  let toMs = fromMs;

  for (const { milliseconds } of timedRows) {
    fromMs = Math.min(fromMs, milliseconds);
    toMs = Math.max(toMs, milliseconds);
  }
  const intervalMs = chooseBucketInterval(toMs - fromMs);
  const bucketStartMs = floorToInterval(fromMs, intervalMs);
  const bucketEndMs = floorToInterval(toMs, intervalMs);
  const bucketCount = Math.floor((bucketEndMs - bucketStartMs) / intervalMs) + 1;
  const buckets = Array.from({ length: bucketCount }, (_, index) =>
    createHistogramBucket(bucketStartMs + index * intervalMs, intervalMs),
  );

  for (const { row, milliseconds } of timedRows) {
    const bucketIndex = Math.floor((milliseconds - bucketStartMs) / intervalMs);
    const bucket = buckets[bucketIndex];

    if (!bucket) {
      continue;
    }

    const tone = getSeverityTone(row);

    bucket[tone] += 1;
    bucket.total += 1;
  }

  return {
    buckets,
    total: filteredRows.length,
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    intervalMs,
  };
}

function createFilteredRows(
  otlpLogs: OtlpLogsResponse,
  searchParams: URLSearchParams,
): {
  filteredRows: IndexedLogRow[];
  total: number;
} {
  const rows = flattenLogs(otlpLogs);
  const filters = createFilters(searchParams);
  const filteredRows = filters.length
    ? rows.filter((row) => matchesFilters(row, filters))
    : rows;

  return {
    filteredRows,
    total: rows.length,
  };
}

function flattenLogs(otlpLogs: OtlpLogsResponse | undefined): IndexedLogRow[] {
  const rows: IndexedLogRow[] = [];

  for (const resourceLog of otlpLogs?.resourceLogs ?? []) {
    const resourceAttributes = attributesToRecord(
      resourceLog.resource?.attributes,
    );
    const resourceIndex = createAttributeIndex(resourceAttributes);
    const service = resourceIndex["service.name"] ?? UNKNOWN_SERVICE;

    for (const scopeLog of resourceLog.scopeLogs ?? []) {
      const scopeName = scopeLog.scope?.name?.trim() || undefined;
      const scopeAttributes = attributesToRecord(scopeLog.scope?.attributes);
      const scopeIndex = createAttributeIndex(scopeAttributes);

      for (const logRecord of scopeLog.logRecords ?? []) {
        const logAttributes = attributesToRecord(logRecord.attributes);
        const logIndex = createAttributeIndex(logAttributes);
        const severity = formatSeverity(logRecord);

        rows.push({
          id: createLogRowId(rows.length, logRecord),
          time: formatUnixNanoTime(logRecord.timeUnixNano),
          timeUnixNano: logRecord.timeUnixNano,
          severity,
          severityText: logRecord.severityText,
          severityNumber: logRecord.severityNumber,
          service,
          scopeName,
          message: formatAnyValue(logRecord.body) ?? NO_MESSAGE,
          resourceAttributes,
          scopeAttributes,
          logAttributes,
          traceId: formatId(logRecord.traceId),
          spanId: formatId(logRecord.spanId),
          indexes: {
            resource: resourceIndex,
            scopeAttributes: scopeIndex,
            log: logIndex,
            scopeName: normalize(scopeName),
            severity: normalizeForIndex(severity),
          },
        });
      }
    }
  }

  return rows;
}

function createFilters(searchParams: URLSearchParams): Filter[] {
  const filtersByKey = new Map<string, Filter>();

  searchParams.forEach((value, key) => {
    const filterTarget = getFilterTarget(key);

    if (!filterTarget) {
      return;
    }

    const filterKey = `${filterTarget.target}:${filterTarget.key}`;
    const filter = filtersByKey.get(filterKey) ?? {
      ...filterTarget,
      values: new Set<string>(),
    };
    const normalizedValue = normalize(value);

    if (normalizedValue) {
      filter.values.add(normalizedValue);
      filtersByKey.set(filterKey, filter);
    }
  });

  return Array.from(filtersByKey.values()).filter(
    (filter) => filter.values.size > 0,
  );
}

function getFilterTarget(
  queryKey: string,
): Pick<Filter, "target" | "key"> | undefined {
  if (queryKey === "service") {
    return {
      target: "resource",
      key: "service.name",
    };
  }

  if (queryKey === "severity") {
    return {
      target: "log",
      key: "severity",
    };
  }

  if (queryKey.startsWith("resource.")) {
    return {
      target: "resource",
      key: queryKey.slice("resource.".length),
    };
  }

  if (queryKey === "scope.name") {
    return {
      target: "scopeName",
      key: "name",
    };
  }

  if (queryKey.startsWith("scope.")) {
    return {
      target: "scopeAttributes",
      key: queryKey.slice("scope.".length),
    };
  }

  if (queryKey.startsWith("log.")) {
    return {
      target: "log",
      key: queryKey.slice("log.".length),
    };
  }

  return undefined;
}

function matchesFilters(row: IndexedLogRow, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = getFilterValue(row, filter);

    return value !== undefined && filter.values.has(value);
  });
}

function getFilterValue(row: IndexedLogRow, filter: Filter): string | undefined {
  if (filter.target === "scopeName") {
    return row.indexes.scopeName;
  }

  if (filter.target === "log" && filter.key === "severity") {
    return row.indexes.severity;
  }

  return row.indexes[filter.target][normalizeKey(filter.key)];
}

function getLimit(searchParams: URLSearchParams): number | undefined {
  const rawLimit = searchParams.get("limit");

  if (!rawLimit) {
    return undefined;
  }

  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit <= 0) {
    return undefined;
  }

  return limit;
}

function sortRowsByTimeDesc(rows: IndexedLogRow[]): IndexedLogRow[] {
  return rows
    .map((row, index) => ({
      index,
      row,
      timeUnixNano: unixNanoToBigInt(row.timeUnixNano),
    }))
    .sort((left, right) => {
      if (left.timeUnixNano === undefined && right.timeUnixNano === undefined) {
        return left.index - right.index;
      }

      if (left.timeUnixNano === undefined) {
        return 1;
      }

      if (right.timeUnixNano === undefined) {
        return -1;
      }

      if (left.timeUnixNano === right.timeUnixNano) {
        return left.index - right.index;
      }

      return left.timeUnixNano > right.timeUnixNano ? -1 : 1;
    })
    .map(({ row }) => row);
}

function chooseBucketInterval(spanMs: number): number {
  if (!Number.isFinite(spanMs) || spanMs <= 0) {
    return DEFAULT_BUCKET_INTERVAL_MS;
  }

  return (
    BUCKET_INTERVALS_MS.find(
      (intervalMs) => Math.ceil(spanMs / intervalMs) + 1 <= TARGET_MAX_BUCKETS,
    ) ?? BUCKET_INTERVALS_MS[BUCKET_INTERVALS_MS.length - 1]
  );
}

function floorToInterval(milliseconds: number, intervalMs: number): number {
  return Math.floor(milliseconds / intervalMs) * intervalMs;
}

function createHistogramBucket(
  bucketStartMs: number,
  intervalMs: number,
): LogsHistogramBucket {
  return {
    start: new Date(bucketStartMs).toISOString(),
    label: formatBucketLabel(bucketStartMs, intervalMs),
    total: 0,
    info: 0,
    warning: 0,
    error: 0,
    neutral: 0,
  };
}

function formatBucketLabel(bucketStartMs: number, intervalMs: number): string {
  const date = new Date(bucketStartMs);

  if (intervalMs < 24 * 60 * 60_000) {
    return date.toISOString().slice(11, 16);
  }

  return date.toISOString().slice(0, 10);
}

function stripIndexes(row: IndexedLogRow): LogRow {
  return {
    id: row.id,
    time: row.time,
    timeUnixNano: row.timeUnixNano,
    severity: row.severity,
    severityText: row.severityText,
    severityNumber: row.severityNumber,
    service: row.service,
    scopeName: row.scopeName,
    message: row.message,
    resourceAttributes: row.resourceAttributes,
    scopeAttributes: row.scopeAttributes,
    logAttributes: row.logAttributes,
    traceId: row.traceId,
    spanId: row.spanId,
  };
}

function createLogRowId(index: number, logRecord: LogRecord): string {
  return [
    index,
    String(logRecord.timeUnixNano ?? ""),
    String(formatId(logRecord.traceId) ?? ""),
    String(formatId(logRecord.spanId) ?? ""),
  ].join(":");
}

function attributesToRecord(
  attributes: IKeyValue[] | undefined,
): Record<string, string> {
  const record: Record<string, string> = {};

  for (const attribute of attributes ?? []) {
    const formattedValue = formatAnyValue(attribute.value);

    if (formattedValue !== undefined) {
      record[attribute.key] = formattedValue;
    }
  }

  return record;
}

function createAttributeIndex(
  attributes: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      normalizeKey(key),
      normalizeForIndex(value),
    ]),
  );
}

function formatSeverity(logRecord: LogRecord): string {
  return (
    logRecord.severityText?.trim() ||
    String(logRecord.severityNumber ?? "Unspecified")
  );
}

function formatUnixNanoTime(timeUnixNano: LogRecord["timeUnixNano"]): string {
  const milliseconds = unixNanoToMilliseconds(timeUnixNano);

  if (milliseconds === undefined) {
    return UNKNOWN_TIME;
  }

  return new Date(milliseconds).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });
}

function unixNanoToMilliseconds(
  timeUnixNano: LogRow["timeUnixNano"],
): number | undefined {
  if (typeof timeUnixNano === "string") {
    try {
      return Number(BigInt(timeUnixNano) / BigInt(1000000));
    } catch {
      return undefined;
    }
  }

  if (typeof timeUnixNano === "number" && Number.isFinite(timeUnixNano)) {
    return Math.trunc(timeUnixNano / 1_000_000);
  }

  return undefined;
}

function unixNanoToBigInt(
  timeUnixNano: LogRow["timeUnixNano"],
): bigint | undefined {
  if (typeof timeUnixNano === "string") {
    try {
      return BigInt(timeUnixNano);
    } catch {
      return undefined;
    }
  }

  if (typeof timeUnixNano === "number" && Number.isFinite(timeUnixNano)) {
    return BigInt(Math.trunc(timeUnixNano));
  }

  return undefined;
}

function formatAnyValue(value: IAnyValue | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.stringValue != null) {
    return value.stringValue || undefined;
  }

  if (value.boolValue != null) {
    return String(value.boolValue);
  }

  if (value.intValue != null) {
    return String(value.intValue);
  }

  if (value.doubleValue != null) {
    return String(value.doubleValue);
  }

  if (value.bytesValue != null) {
    return typeof value.bytesValue === "string" ? value.bytesValue : "[bytes]";
  }

  if (value.arrayValue) {
    return `[${value.arrayValue.values
      .map(formatAnyValue)
      .filter(Boolean)
      .join(", ")}]`;
  }

  if (value.kvlistValue) {
    return value.kvlistValue.values
      .map((entry) => {
        const formattedValue = formatAnyValue(entry.value);

        return formattedValue ? `${entry.key}: ${formattedValue}` : entry.key;
      })
      .join(", ");
  }

  return undefined;
}

function formatId(id: LogRecord["traceId"] | LogRecord["spanId"]): string | undefined {
  if (typeof id === "string") {
    return id;
  }

  if (id instanceof Uint8Array) {
    return Buffer.from(id).toString("hex");
  }

  return undefined;
}

function normalize(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue.toLocaleLowerCase() : undefined;
}

function normalizeForIndex(value: string): string {
  return normalize(value) ?? "";
}

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}
