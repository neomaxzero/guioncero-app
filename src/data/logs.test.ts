import { describe, expect, it } from "vitest";

import { createLogsUrl, logsQueryKey } from "./logs";

describe("logs data helpers", () => {
  it("creates a primitive query key for selected fields", () => {
    expect(logsQueryKey(["severity", "message"])).toEqual([
      "logs",
      "severity,message",
    ]);
  });

  it("creates field query params in registry order", () => {
    expect(createLogsUrl(["message", "severity"])).toBe(
      "/api/logs?field=severity&field=message",
    );
  });
});
