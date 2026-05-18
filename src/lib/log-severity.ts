import type { LogRow } from "@/models";

export type SeverityTone = "error" | "warning" | "info" | "neutral";

export type SeverityPresentation = {
  label: string;
  tone: SeverityTone;
};

export const severityToneOrder = [
  "error",
  "warning",
  "info",
  "neutral",
] as const satisfies readonly SeverityTone[];

export const severityToneLabels: Record<SeverityTone, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
  neutral: "Other",
};

export const severityToneChartColors: Record<SeverityTone, string> = {
  error: "oklch(0.577 0.245 27.325)",
  warning: "oklch(0.795 0.184 86.047)",
  info: "oklch(0.623 0.214 259.815)",
  neutral: "var(--muted-foreground)",
};

export const severityToneBadgeClassNames: Record<SeverityTone, string> = {
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  warning:
    "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  neutral:
    "border-border bg-muted/60 text-muted-foreground dark:bg-muted/40",
};

const UNKNOWN_SEVERITY_LABEL = "UNKNOWN";

export function getSeverityPresentation(
  row: Pick<LogRow, "severity" | "severityNumber" | "severityText">,
): SeverityPresentation {
  const tone = getSeverityTone(row);

  return {
    label: getSeverityLabel(row, tone),
    tone,
  };
}

export function getSeverityTone(
  row: Pick<LogRow, "severity" | "severityNumber" | "severityText">,
): SeverityTone {
  const toneFromNumber = getSeverityToneFromNumber(row.severityNumber);

  if (toneFromNumber) {
    return toneFromNumber;
  }

  return getSeverityToneFromText(row.severityText ?? row.severity);
}

function getSeverityToneFromNumber(
  severityNumber: LogRow["severityNumber"],
): SeverityTone | undefined {
  if (typeof severityNumber !== "number" || !Number.isFinite(severityNumber)) {
    return undefined;
  }

  if (severityNumber >= 17) {
    return "error";
  }

  if (severityNumber >= 13) {
    return "warning";
  }

  if (severityNumber >= 9) {
    return "info";
  }

  return "neutral";
}

function getSeverityToneFromText(severity: string | undefined): SeverityTone {
  const normalizedSeverity = normalizeSeverity(severity);

  if (
    normalizedSeverity.includes("fatal") ||
    normalizedSeverity.includes("error")
  ) {
    return "error";
  }

  if (
    normalizedSeverity.includes("warn") ||
    normalizedSeverity.includes("warning")
  ) {
    return "warning";
  }

  if (
    normalizedSeverity.includes("info") ||
    normalizedSeverity.includes("information")
  ) {
    return "info";
  }

  return "neutral";
}

function getSeverityLabel(
  row: Pick<LogRow, "severity" | "severityNumber" | "severityText">,
  tone: SeverityTone,
): string {
  const severityText = row.severityText ?? row.severity;
  const compactTextLabel = getCompactTextLabel(severityText);
  const compactNumberLabel = getCompactNumberLabel(row.severityNumber);

  if (isNumericSeverity(severityText) && compactNumberLabel) {
    return compactNumberLabel;
  }

  if (
    compactTextLabel !== UNKNOWN_SEVERITY_LABEL &&
    !isNumericSeverity(severityText)
  ) {
    return compactTextLabel;
  }

  if (tone === "error") {
    return "ERROR";
  }

  if (tone === "warning") {
    return "WARN";
  }

  if (tone === "info") {
    return "INFO";
  }

  return UNKNOWN_SEVERITY_LABEL;
}

function getCompactTextLabel(severity: string | undefined): string {
  const normalizedSeverity = normalizeSeverity(severity);

  if (
    normalizedSeverity.includes("fatal") ||
    normalizedSeverity.includes("error")
  ) {
    return "ERROR";
  }

  if (
    normalizedSeverity.includes("warn") ||
    normalizedSeverity.includes("warning")
  ) {
    return "WARN";
  }

  if (
    normalizedSeverity.includes("info") ||
    normalizedSeverity.includes("information")
  ) {
    return "INFO";
  }

  if (normalizedSeverity.includes("debug")) {
    return "DEBUG";
  }

  if (normalizedSeverity.includes("trace")) {
    return "TRACE";
  }

  if (
    normalizedSeverity.includes("unspecified") ||
    normalizedSeverity.includes("unknown")
  ) {
    return UNKNOWN_SEVERITY_LABEL;
  }

  const trimmedSeverity = severity?.trim();

  return trimmedSeverity
    ? trimmedSeverity.toLocaleUpperCase()
    : UNKNOWN_SEVERITY_LABEL;
}

function normalizeSeverity(severity: string | undefined): string {
  return severity?.trim().toLocaleLowerCase() ?? "";
}

function isNumericSeverity(severity: string | undefined): boolean {
  const trimmedSeverity = severity?.trim();

  return trimmedSeverity ? !Number.isNaN(Number(trimmedSeverity)) : false;
}

function getCompactNumberLabel(
  severityNumber: LogRow["severityNumber"],
): string | undefined {
  if (typeof severityNumber !== "number" || !Number.isFinite(severityNumber)) {
    return undefined;
  }

  if (severityNumber >= 17) {
    return "ERROR";
  }

  if (severityNumber >= 13) {
    return "WARN";
  }

  if (severityNumber >= 9) {
    return "INFO";
  }

  if (severityNumber >= 5) {
    return "DEBUG";
  }

  if (severityNumber >= 1) {
    return "TRACE";
  }

  return UNKNOWN_SEVERITY_LABEL;
}
