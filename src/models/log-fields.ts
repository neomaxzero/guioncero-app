export type LogFieldDefinition = {
  id: string;
  label: string;
  width: string;
  minWidthRem: number;
  skeletonWidthClassName: string;
};

export const LOG_FIELD_QUERY_PARAM = "field";

export const LOG_FIELD_DEFINITIONS = [
  {
    id: "severity",
    label: "Severity",
    width: "7rem",
    minWidthRem: 7,
    skeletonWidthClassName: "w-14",
  },
  {
    id: "time",
    label: "Time",
    width: "13rem",
    minWidthRem: 13,
    skeletonWidthClassName: "w-36",
  },
  {
    id: "service",
    label: "Service",
    width: "12rem",
    minWidthRem: 12,
    skeletonWidthClassName: "w-28",
  },
  {
    id: "message",
    label: "Message",
    width: "minmax(22rem,1fr)",
    minWidthRem: 22,
    skeletonWidthClassName: "w-full",
  },
  {
    id: "traceId",
    label: "Trace ID",
    width: "18rem",
    minWidthRem: 18,
    skeletonWidthClassName: "w-52",
  },
  {
    id: "spanId",
    label: "Span ID",
    width: "11rem",
    minWidthRem: 11,
    skeletonWidthClassName: "w-36",
  },
  {
    id: "scopeName",
    label: "Scope",
    width: "14rem",
    minWidthRem: 14,
    skeletonWidthClassName: "w-40",
  },
  {
    id: "resource.service.namespace",
    label: "Namespace",
    width: "12rem",
    minWidthRem: 12,
    skeletonWidthClassName: "w-32",
  },
  {
    id: "resource.service.version",
    label: "Version",
    width: "10rem",
    minWidthRem: 10,
    skeletonWidthClassName: "w-24",
  },
  {
    id: "log.http.route",
    label: "HTTP route",
    width: "16rem",
    minWidthRem: 16,
    skeletonWidthClassName: "w-44",
  },
  {
    id: "log.http.status_code",
    label: "HTTP status",
    width: "9rem",
    minWidthRem: 9,
    skeletonWidthClassName: "w-20",
  },
] as const;

export type LogFieldId = (typeof LOG_FIELD_DEFINITIONS)[number]["id"];

export const DEFAULT_VISIBLE_LOG_FIELD_IDS = [
  "severity",
  "time",
  "service",
  "message",
] as const satisfies readonly LogFieldId[];

const logFieldIds = LOG_FIELD_DEFINITIONS.map((field) => field.id);
const logFieldIdSet = new Set<string>(logFieldIds);

export function isLogFieldId(value: string): value is LogFieldId {
  return logFieldIdSet.has(value);
}

export function normalizeVisibleLogFieldIds(
  fieldIds: readonly string[] | undefined,
  fallback: readonly LogFieldId[] = DEFAULT_VISIBLE_LOG_FIELD_IDS,
): LogFieldId[] {
  const selectedIds = new Set(fieldIds?.filter(isLogFieldId));
  const normalizedIds = LOG_FIELD_DEFINITIONS.map((field) => field.id).filter(
    (id) => selectedIds.has(id),
  );

  return normalizedIds.length > 0 ? normalizedIds : [...fallback];
}

export function getLogFieldDefinition(
  fieldId: LogFieldId,
): (typeof LOG_FIELD_DEFINITIONS)[number] {
  return LOG_FIELD_DEFINITIONS.find((field) => field.id === fieldId)!;
}
