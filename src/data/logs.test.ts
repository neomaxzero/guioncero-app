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
    expect(logsViewQueryKey(["severity", "message"])).toEqual([
      "logs-view",
      "severity,message",
    ]);
  });

  it("creates field query params in registry order", () => {
    expect(createLogsUrl(["message", "severity"])).toBe(
      "/api/logs?field=severity&field=message",
    );
    expect(createLogsViewUrl(["message", "severity"])).toBe(
      "/api/logs/view?field=severity&field=message",
    );
  });
});
