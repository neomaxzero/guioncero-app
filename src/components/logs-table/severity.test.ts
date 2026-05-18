import { describe, expect, it } from "vitest";

import { getSeverityPresentation } from "../../lib/log-severity";

describe("getSeverityPresentation", () => {
  it("maps OTLP severity numbers to compact tones and labels", () => {
    expect(
      getSeverityPresentation({
        severity: "17",
        severityNumber: 17,
      }),
    ).toEqual({
      label: "ERROR",
      tone: "error",
    });
    expect(
      getSeverityPresentation({
        severity: "13",
        severityNumber: 13,
      }),
    ).toEqual({
      label: "WARN",
      tone: "warning",
    });
    expect(
      getSeverityPresentation({
        severity: "9",
        severityNumber: 9,
      }),
    ).toEqual({
      label: "INFO",
      tone: "info",
    });
    expect(
      getSeverityPresentation({
        severity: "5",
        severityNumber: 5,
      }),
    ).toEqual({
      label: "DEBUG",
      tone: "neutral",
    });
  });

  it("falls back to severity text and severity string matching", () => {
    expect(getSeverityPresentation({ severity: "Information" })).toEqual({
      label: "INFO",
      tone: "info",
    });
    expect(
      getSeverityPresentation({
        severity: "Unspecified",
        severityText: "Warning",
      }),
    ).toEqual({
      label: "WARN",
      tone: "warning",
    });
    expect(getSeverityPresentation({ severity: "fatal" })).toEqual({
      label: "ERROR",
      tone: "error",
    });
  });

  it("handles unknown and empty severities safely", () => {
    expect(getSeverityPresentation({ severity: "" })).toEqual({
      label: "UNKNOWN",
      tone: "neutral",
    });
    expect(getSeverityPresentation({ severity: "Debug" })).toEqual({
      label: "DEBUG",
      tone: "neutral",
    });
    expect(getSeverityPresentation({ severity: "Unspecified" })).toEqual({
      label: "UNKNOWN",
      tone: "neutral",
    });
  });
});
