import type {
  IAnyValue,
  IKeyValue,
} from "@opentelemetry/otlp-transformer/build/src/common/internal-types";

import type { LogRecord, LogsResponse, ResourceLogs } from "@/models";

const MAX_LOG_ROWS = 20;
const UNKNOWN_TIME = "Unknown time";
const UNKNOWN_SERVICE = "unknown service";
const NO_MESSAGE = "No message";

export type LogTableRow = {
  id: string;
  time: string;
  severity: string;
  service: string;
  message: string;
};

export function createLogTableRows(
  logs: LogsResponse | undefined,
): LogTableRow[] {
  const rows: LogTableRow[] = [];

  for (const resourceLog of logs?.resourceLogs ?? []) {
    const service = getServiceName(resourceLog);

    for (const scopeLog of resourceLog.scopeLogs ?? []) {
      for (const logRecord of scopeLog.logRecords ?? []) {
        rows.push({
          id: createLogRowId(rows.length, logRecord),
          time: formatUnixNanoTime(logRecord.timeUnixNano),
          severity: formatSeverity(logRecord),
          service,
          message: formatAnyValue(logRecord.body) ?? NO_MESSAGE,
        });

        if (rows.length === MAX_LOG_ROWS) {
          return rows;
        }
      }
    }
  }

  return rows;
}

function createLogRowId(index: number, logRecord: LogRecord): string {
  return [
    index,
    String(logRecord.timeUnixNano ?? ""),
    String(logRecord.traceId ?? ""),
    String(logRecord.spanId ?? ""),
  ].join(":");
}

function getServiceName(resourceLog: ResourceLogs): string {
  const serviceName = findAttributeValue(
    resourceLog.resource?.attributes,
    "service.name",
  );

  return serviceName ?? UNKNOWN_SERVICE;
}

function findAttributeValue(
  attributes: IKeyValue[] | undefined,
  key: string,
): string | undefined {
  const value = attributes?.find((attribute) => attribute.key === key)?.value;

  return formatAnyValue(value);
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
  timeUnixNano: LogRecord["timeUnixNano"],
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
