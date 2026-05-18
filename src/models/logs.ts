import type {
  IExportLogsServiceRequest,
  ILogRecord,
  IResourceLogs,
} from "@opentelemetry/otlp-transformer/build/src/logs/internal-types";

export type LogsResponse = IExportLogsServiceRequest;
export type ResourceLogs = IResourceLogs;
export type LogRecord = ILogRecord;
