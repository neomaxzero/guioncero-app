import { describe, expect, it } from "vitest";

import type { LogRecord, OtlpLogsResponse } from "@/models";

import {
  createLogsHistogramResponse,
  createLogsResponse,
  createLogsViewResponse,
} from "./logs-bff";

function createSearchParams(query = "") {
  return new URLSearchParams(query);
}

function createLogRecord(
  message: string,
  overrides: Partial<LogRecord> = {},
): LogRecord {
  return {
    timeUnixNano: "1544712660300000000",
    observedTimeUnixNano: "1544712660300000000",
    severityText: "Information",
    body: {
      stringValue: message,
    },
    attributes: [],
    droppedAttributesCount: 0,
    ...overrides,
  };
}

function createLogsResponseFixture(
  logRecords: LogRecord[],
): OtlpLogsResponse {
  return {
    resourceLogs: [
      {
        resource: {
          attributes: [
            {
              key: "service.name",
              value: {
                stringValue: "checkout-api",
              },
            },
            {
              key: "service.namespace",
              value: {
                stringValue: "payments",
              },
            },
          ],
          droppedAttributesCount: 0,
        },
        scopeLogs: [
          {
            scope: {
              name: "my.library",
              attributes: [
                {
                  key: "scope.kind",
                  value: {
                    stringValue: "runtime",
                  },
                },
              ],
            },
            logRecords,
          },
        ],
      },
    ],
  };
}

function unixMsToNanoString(milliseconds: number): string {
  return String(BigInt(milliseconds) * BigInt(1_000_000));
}

describe("createLogsResponse", () => {
  it("flattens resources, scopes, and log records in upstream order", () => {
    const logs: OtlpLogsResponse = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "api-a" } },
            ],
            droppedAttributesCount: 0,
          },
          scopeLogs: [
            {
              scope: { name: "scope-a" },
              logRecords: [createLogRecord("first"), createLogRecord("second")],
            },
          ],
        },
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "api-b" } },
            ],
            droppedAttributesCount: 0,
          },
          scopeLogs: [
            {
              scope: { name: "scope-b" },
              logRecords: [createLogRecord("third")],
            },
          ],
        },
      ],
    };

    const response = createLogsResponse(logs, createSearchParams());

    expect(response).toMatchObject({
      total: 3,
      filtered: 3,
    });
    expect(response.rows.map((row) => row.message)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(response.rows.map((row) => row.service)).toEqual([
      "api-a",
      "api-a",
      "api-b",
    ]);
  });

  it("extracts resource, scope, and log attributes into flat rows", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("ok", {
          traceId: "5B8EFFF798038103D269B633813FC60C",
          spanId: "EEE19B7EC3C1B174",
          attributes: [
            {
              key: "http.status_code",
              value: {
                intValue: 500,
              },
            },
          ],
        }),
      ]),
      createSearchParams(
        "field=time&field=service&field=message&field=scopeName&field=traceId&field=spanId&field=resource.service.namespace&field=log.http.status_code",
      ),
    );

    expect(response.rows[0]).toMatchObject({
      service: "checkout-api",
      scopeName: "my.library",
      message: "ok",
      resourceAttributes: {
        "service.namespace": "payments",
      },
      logAttributes: {
        "http.status_code": "500",
      },
      traceId: "5B8EFFF798038103D269B633813FC60C",
      spanId: "EEE19B7EC3C1B174",
    });
    expect(response.rows[0]).not.toHaveProperty("severity");
    expect(response.rows[0]).not.toHaveProperty("severityText");
    expect(response.rows[0]).not.toHaveProperty("severityNumber");
    expect(response.rows[0]?.time).not.toBe("Unknown time");
  });

  it("returns default visible fields plus required essentials when field params are omitted", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("ok", {
          traceId: "5B8EFFF798038103D269B633813FC60C",
          spanId: "EEE19B7EC3C1B174",
          attributes: [
            {
              key: "http.route",
              value: {
                stringValue: "/checkout",
              },
            },
          ],
        }),
      ]),
      createSearchParams(),
    );

    const row = response.rows[0];

    expect(row).toMatchObject({
      id: expect.any(String),
      timeUnixNano: "1544712660300000000",
      severity: "Information",
      severityText: "Information",
      service: "checkout-api",
      message: "ok",
    });
    expect(row?.time).not.toBeUndefined();
    expect(row).not.toHaveProperty("traceId");
    expect(row).not.toHaveProperty("spanId");
    expect(row).not.toHaveProperty("logAttributes");
    expect(row).not.toHaveProperty("resourceAttributes");
  });

  it("projects only selected fields plus row id", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("ok", {
          severityNumber: 10,
          traceId: "5B8EFFF798038103D269B633813FC60C",
          attributes: [
            {
              key: "http.route",
              value: {
                stringValue: "/checkout",
              },
            },
          ],
        }),
      ]),
      createSearchParams("field=traceId&field=log.http.route"),
    );

    const row = response.rows[0];

    expect(row).toMatchObject({
      id: expect.any(String),
      traceId: "5B8EFFF798038103D269B633813FC60C",
      logAttributes: {
        "http.route": "/checkout",
      },
    });
    expect(row).not.toHaveProperty("time");
    expect(row).not.toHaveProperty("timeUnixNano");
    expect(row).not.toHaveProperty("severity");
    expect(row).not.toHaveProperty("severityText");
    expect(row).not.toHaveProperty("severityNumber");
    expect(row).not.toHaveProperty("service");
    expect(row).not.toHaveProperty("message");
  });

  it("returns backing data only for selected columns that need it", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("ok", {
          severityNumber: 10,
        }),
      ]),
      createSearchParams("field=severity&field=time"),
    );

    expect(response.rows[0]).toMatchObject({
      id: expect.any(String),
      timeUnixNano: "1544712660300000000",
      severity: "Information",
      severityText: "Information",
      severityNumber: 10,
    });
    expect(response.rows[0]?.time).not.toBeUndefined();
    expect(response.rows[0]).not.toHaveProperty("message");
  });

  it("returns compact histogram correlation metadata when time and severity columns are hidden", () => {
    const startMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("info", {
          timeUnixNano: unixMsToNanoString(startMs + 1_000),
          severityText: "Information",
        }),
        createLogRecord("warning", {
          timeUnixNano: unixMsToNanoString(startMs + 61_000),
          severityText: "Warning",
        }),
      ]),
      createSearchParams("field=message"),
    );

    expect(response.rows[0]).toMatchObject({
      message: "warning",
      histogramBucketStart: "2026-01-01T12:01:00.000Z",
      severityTone: "warning",
    });
    expect(response.rows[1]).toMatchObject({
      message: "info",
      histogramBucketStart: "2026-01-01T12:00:00.000Z",
      severityTone: "info",
    });
    expect(response.rows[0]).not.toHaveProperty("time");
    expect(response.rows[0]).not.toHaveProperty("timeUnixNano");
    expect(response.rows[0]).not.toHaveProperty("severity");
    expect(response.rows[0]).not.toHaveProperty("severityText");
    expect(response.rows[0]).not.toHaveProperty("severityNumber");
  });

  it("uses the same bucket starts for log rows and histogram buckets", () => {
    const startMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const logs = createLogsResponseFixture([
      createLogRecord("first", {
        timeUnixNano: unixMsToNanoString(startMs + 1_000),
      }),
      createLogRecord("second", {
        timeUnixNano: unixMsToNanoString(startMs + 10_000),
      }),
    ]);

    const tableResponse = createLogsResponse(
      logs,
      createSearchParams("field=message"),
    );
    const histogramResponse = createLogsHistogramResponse(
      logs,
      createSearchParams(),
    );

    expect(histogramResponse.buckets).toHaveLength(1);
    expect(tableResponse.rows).toHaveLength(2);
    expect(tableResponse.rows.map((row) => row.histogramBucketStart)).toEqual([
      histogramResponse.buckets[0]?.start,
      histogramResponse.buckets[0]?.start,
    ]);
  });

  it("does not assign histogram bucket metadata to rows with invalid timestamps", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("invalid", {
          timeUnixNano: "not-a-number",
          severityText: "Error",
        }),
      ]),
      createSearchParams("field=message"),
    );

    expect(response.rows[0]).toMatchObject({
      message: "invalid",
      severityTone: "error",
    });
    expect(response.rows[0]).not.toHaveProperty("histogramBucketStart");
  });

  it("ignores unsupported field params and preserves valid selected fields", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([
        createLogRecord("ok", {
          spanId: "EEE19B7EC3C1B174",
        }),
      ]),
      createSearchParams("field=unknown&field=spanId"),
    );

    expect(response.rows[0]).toMatchObject({
      spanId: "EEE19B7EC3C1B174",
    });
    expect(response.rows[0]).not.toHaveProperty("severity");
    expect(response.rows[0]).not.toHaveProperty("message");
  });

  it("falls back to default fields when all field params are unsupported", () => {
    const response = createLogsResponse(
      createLogsResponseFixture([createLogRecord("ok")]),
      createSearchParams("field=unknown"),
    );

    expect(response.rows[0]).toMatchObject({
      severity: "Information",
      service: "checkout-api",
      message: "ok",
    });
    expect(response.rows[0]?.time).not.toBeUndefined();
  });

  it("filters by service, severity, and prefixed attributes with exact case-insensitive matches", () => {
    const logs = createLogsResponseFixture([
      createLogRecord("keep", {
        severityText: "Error",
        attributes: [
          {
            key: "http.route",
            value: {
              stringValue: "/checkout",
            },
          },
        ],
      }),
      createLogRecord("drop", {
        severityText: "Warning",
        attributes: [
          {
            key: "http.route",
            value: {
              stringValue: "/cart",
            },
          },
        ],
      }),
    ]);

    const response = createLogsResponse(
      logs,
      createSearchParams(
        "service=CHECKOUT-API&severity=error&resource.service.namespace=Payments&scope.name=MY.LIBRARY&scope.scope.kind=Runtime&log.http.route=/checkout",
      ),
    );

    expect(response).toMatchObject({
      total: 2,
      filtered: 1,
    });
    expect(response.rows.map((row) => row.message)).toEqual(["keep"]);
  });

  it("sorts rows by newest time before applying limit", () => {
    const logs = createLogsResponseFixture([
      createLogRecord("oldest", {
        timeUnixNano: "1544712660100000000",
      }),
      createLogRecord("newest", {
        timeUnixNano: "1544712660300000000",
      }),
      createLogRecord("middle", {
        timeUnixNano: "1544712660200000000",
      }),
    ]);

    const response = createLogsResponse(logs, createSearchParams("limit=2"));

    expect(response).toMatchObject({
      total: 3,
      filtered: 3,
    });
    expect(response.rows.map((row) => row.message)).toEqual([
      "newest",
      "middle",
    ]);
  });

  it("keeps invalid and equal times in deterministic upstream order after valid times", () => {
    const logs = createLogsResponseFixture([
      createLogRecord("invalid-a", {
        timeUnixNano: "not-a-number",
      }),
      createLogRecord("newest-a", {
        timeUnixNano: "1544712660300000000",
      }),
      createLogRecord("newest-b", {
        timeUnixNano: "1544712660300000000",
      }),
      createLogRecord("invalid-b", {
        timeUnixNano: undefined,
      }),
      createLogRecord("older", {
        timeUnixNano: "1544712660200000000",
      }),
    ]);

    const response = createLogsResponse(logs, createSearchParams());

    expect(response.rows.map((row) => row.message)).toEqual([
      "newest-a",
      "newest-b",
      "older",
      "invalid-a",
      "invalid-b",
    ]);
  });

  it("ORs repeated same-key filters and ANDs different filters", () => {
    const logs = createLogsResponseFixture([
      createLogRecord("error", {
        severityText: "Error",
      }),
      createLogRecord("warning", {
        severityText: "Warning",
      }),
      createLogRecord("info", {
        severityText: "Information",
      }),
    ]);

    const response = createLogsResponse(
      logs,
      createSearchParams(
        "severity=error&severity=warning&resource.service.namespace=payments",
      ),
    );

    expect(response).toMatchObject({
      total: 3,
      filtered: 2,
    });
    expect(response.rows.map((row) => row.message)).toEqual([
      "error",
      "warning",
    ]);
  });

  it("ignores unknown unprefixed query params", () => {
    const logs = createLogsResponseFixture([createLogRecord("ok")]);

    const response = createLogsResponse(
      logs,
      createSearchParams("environment=production"),
    );

    expect(response).toMatchObject({
      total: 1,
      filtered: 1,
    });
    expect(response.rows.map((row) => row.message)).toEqual(["ok"]);
  });

  it("applies limit after filtering while preserving total and filtered counts", () => {
    const logs = createLogsResponseFixture(
      Array.from({ length: 25 }, (_, index) =>
        createLogRecord(`log-${index}`, {
          severityText: index % 2 === 0 ? "Error" : "Information",
        }),
      ),
    );

    const response = createLogsResponse(
      logs,
      createSearchParams("severity=error&limit=3"),
    );

    expect(response).toMatchObject({
      total: 25,
      filtered: 13,
    });
    expect(response.rows).toHaveLength(3);
    expect(response.rows.map((row) => row.message)).toEqual([
      "log-0",
      "log-2",
      "log-4",
    ]);
  });

  it("keeps rows uncapped when limit is omitted", () => {
    const logs = createLogsResponseFixture(
      Array.from({ length: 25 }, (_, index) => createLogRecord(`log-${index}`)),
    );

    const response = createLogsResponse(logs, createSearchParams());

    expect(response).toMatchObject({
      total: 25,
      filtered: 25,
    });
    expect(response.rows).toHaveLength(25);
  });

  it("uses compact fallbacks for missing OTLP collections and sparse records", () => {
    expect(createLogsResponse({}, createSearchParams())).toEqual({
      rows: [],
      total: 0,
      filtered: 0,
    });

    const logs = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                createLogRecord("", {
                  timeUnixNano: "not-a-number",
                  severityText: "",
                  severityNumber: undefined,
                  body: undefined,
                  attributes: [],
                }),
              ],
            },
            {
              logRecords: undefined,
            },
          ],
        },
        {
          scopeLogs: undefined,
        },
      ],
    } as OtlpLogsResponse;

    const response = createLogsResponse(logs, createSearchParams());

    expect(response.rows[0]).toMatchObject({
      time: "Unknown time",
      severity: "Unspecified",
      service: "unknown service",
      message: "No message",
    });
  });
});

describe("createLogsHistogramResponse", () => {
  it("returns an empty histogram for empty logs", () => {
    expect(createLogsHistogramResponse({}, createSearchParams())).toEqual({
      buckets: [],
      total: 0,
    });
  });

  it("stacks severity tones into coherent time buckets", () => {
    const startMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const logs = createLogsResponseFixture([
      createLogRecord("error", {
        timeUnixNano: unixMsToNanoString(startMs + 1_000),
        severityText: "Error",
      }),
      createLogRecord("warning", {
        timeUnixNano: unixMsToNanoString(startMs + 2_000),
        severityText: "Warning",
      }),
      createLogRecord("info", {
        timeUnixNano: unixMsToNanoString(startMs + 3_000),
        severityText: "Information",
      }),
      createLogRecord("debug", {
        timeUnixNano: unixMsToNanoString(startMs + 4_000),
        severityText: "Debug",
      }),
    ]);

    const response = createLogsHistogramResponse(logs, createSearchParams());

    expect(response).toMatchObject({
      total: 4,
      intervalMs: 60_000,
      buckets: [
        {
          start: "2026-01-01T12:00:00.000Z",
          total: 4,
          error: 1,
          warning: 1,
          info: 1,
          neutral: 1,
        },
      ],
    });
  });

  it("applies filters while ignoring table limits", () => {
    const startMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const logs = createLogsResponseFixture([
      createLogRecord("error-a", {
        timeUnixNano: unixMsToNanoString(startMs),
        severityText: "Error",
      }),
      createLogRecord("error-b", {
        timeUnixNano: unixMsToNanoString(startMs + 20_000),
        severityText: "Error",
      }),
      createLogRecord("info", {
        timeUnixNano: unixMsToNanoString(startMs + 30_000),
        severityText: "Information",
      }),
    ]);

    const response = createLogsHistogramResponse(
      logs,
      createSearchParams("severity=error&limit=1"),
    );

    expect(response.total).toBe(2);
    expect(response.buckets).toHaveLength(1);
    expect(response.buckets[0]).toMatchObject({
      total: 2,
      error: 2,
      info: 0,
    });
  });

  it("excludes invalid timestamps from buckets but keeps them in the total", () => {
    const startMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const logs = createLogsResponseFixture([
      createLogRecord("valid", {
        timeUnixNano: unixMsToNanoString(startMs),
      }),
      createLogRecord("invalid", {
        timeUnixNano: "not-a-number",
      }),
    ]);

    const response = createLogsHistogramResponse(logs, createSearchParams());

    expect(response.total).toBe(2);
    expect(response.buckets).toHaveLength(1);
    expect(response.buckets[0]?.total).toBe(1);
  });

  it("uses wider automatic intervals for longer timeframes", () => {
    const startMs = Date.UTC(2026, 0, 1, 0, 0, 0);
    const logs = createLogsResponseFixture([
      createLogRecord("first", {
        timeUnixNano: unixMsToNanoString(startMs),
      }),
      createLogRecord("last", {
        timeUnixNano: unixMsToNanoString(startMs + 3 * 24 * 60 * 60_000),
      }),
    ]);

    const response = createLogsHistogramResponse(logs, createSearchParams());

    expect(response.intervalMs).toBe(6 * 60 * 60_000);
    expect(response.buckets).toHaveLength(13);
    expect(response.buckets[0]?.start).toBe("2026-01-01T00:00:00.000Z");
    expect(response.buckets.at(-1)?.start).toBe("2026-01-04T00:00:00.000Z");
  });
});

describe("createLogsViewResponse", () => {
  it("builds rows and histogram from the same OTLP payload", () => {
    const startMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const logs = createLogsResponseFixture([
      createLogRecord("error", {
        timeUnixNano: unixMsToNanoString(startMs + 1_000),
        severityText: "Error",
      }),
      createLogRecord("info", {
        timeUnixNano: unixMsToNanoString(startMs + 2_000),
        severityText: "Information",
      }),
    ]);

    const response = createLogsViewResponse(
      logs,
      createSearchParams("field=message"),
    );

    expect(response).toMatchObject({
      total: 2,
      filtered: 2,
      histogram: {
        total: 2,
        buckets: [
          {
            total: 2,
            error: 1,
            info: 1,
          },
        ],
      },
    });
    expect(response.rows.map((row) => row.histogramBucketStart)).toEqual([
      response.histogram.buckets[0]?.start,
      response.histogram.buckets[0]?.start,
    ]);
  });
});
