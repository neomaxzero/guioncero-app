import { describe, expect, it } from "vitest";

import {
  createLogsUrl,
  createLogsViewUrl,
  logsQueryKey,
  logsViewQueryKey,
} from "./logs";

describe("logs data helpers", () => {
  it("creates a primitive query key for selected fields", () => {
    expect(logsQueryKey(["severity", "message"])).toEqual([
      "logs",
      "severity,message",
    ]);
    expect(logsViewQueryKey("logs", ["severity", "message"], ["service"])).toEqual([
      "logs-view",
      "logs",
      "severity,message",
      "",
    ]);
    expect(
      logsViewQueryKey("grouped", ["severity", "message"], ["service", "count"]),
    ).toEqual(["logs-view", "grouped", "severity,message", "service,count"]);
  });

  it("creates field query params in registry order", () => {
    expect(createLogsUrl(["message", "severity"])).toBe(
      "/api/logs?field=severity&field=message",
    );
    expect(createLogsViewUrl("logs", ["message", "severity"], ["service"])).toBe(
      "/api/logs/view?field=severity&field=message",
    );
    expect(
      createLogsViewUrl("grouped", ["message", "severity"], ["count", "service"]),
    ).toBe(
      "/api/logs/view?view=grouped&field=severity&field=message&groupedField=service&groupedField=count",
    );
  });
});
