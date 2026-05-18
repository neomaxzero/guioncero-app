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
  histogramBucketStart?: string;
  severityTone?: "error" | "warning" | "info" | "neutral";
  time?: string;
  timeUnixNano?: LogRecord["timeUnixNano"];
  severity?: string;
  severityText?: string;
  severityNumber?: LogRecord["severityNumber"];
  service?: string;
  scopeName?: string;
  message?: string;
  resourceAttributes?: Record<string, string>;
  scopeAttributes?: Record<string, string>;
  logAttributes?: Record<string, string>;
  traceId?: string;
  spanId?: string;
};

export type LogsViewMode = "logs" | "grouped";

export type LogsResponse = {
  rows: LogRow[];
  total: number;
  filtered: number;
};

export type LogsHistogramBucket = {
  start: string;
  label: string;
  total: number;
  info: number;
  warning: number;
  error: number;
  neutral: number;
};

export type LogsHistogramResponse = {
  buckets: LogsHistogramBucket[];
  total: number;
  from?: string;
  to?: string;
  intervalMs?: number;
};

export type DetailedLogsViewResponse = LogsResponse & {
  view: "logs";
  histogram: LogsHistogramResponse;
};

export type GroupedLogServiceRow = {
  id: string;
  service: string;
  color: string;
  count: number;
  error: number;
  warning: number;
  info: number;
  neutral: number;
  rows: LogRow[];
};

export type GroupedLogsHistogramService = {
  id: string;
  service: string;
  color: string;
};

export type GroupedLogsHistogramBucket = {
  start: string;
  label: string;
  total: number;
  services: Record<string, number>;
};

export type GroupedLogsHistogramResponse = {
  buckets: GroupedLogsHistogramBucket[];
  services: GroupedLogsHistogramService[];
  total: number;
  from?: string;
  to?: string;
  intervalMs?: number;
};

export type GroupedLogsViewResponse = {
  view: "grouped";
  groups: GroupedLogServiceRow[];
  histogram: GroupedLogsHistogramResponse;
  total: number;
  filtered: number;
};

export type LogsViewResponse = DetailedLogsViewResponse | GroupedLogsViewResponse;
