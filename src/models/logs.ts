import type {
  IExportLogsServiceRequest,
  ILogRecord,
  IResourceLogs,
  IScopeLogs,
} from "@opentelemetry/otlp-transformer/build/src/logs/internal-types";

export type OtlpLogsResponse = IExportLogsServiceRequest;
export type ResourceLogs = IResourceLogs;
export type ScopeLogs = IScopeLogs;
export type LogRecord = ILogRecord;

export type LogRow = {
  id: string;
  time: string;
  timeUnixNano?: LogRecord["timeUnixNano"];
  severity: string;
  severityText?: string;
  severityNumber?: LogRecord["severityNumber"];
  service: string;
  scopeName?: string;
  message: string;
  resourceAttributes: Record<string, string>;
  scopeAttributes: Record<string, string>;
  logAttributes: Record<string, string>;
  traceId?: string;
  spanId?: string;
};

export type LogsResponse = {
  rows: LogRow[];
  total: number;
  filtered: number;
};
