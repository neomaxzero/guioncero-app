import { describe, expect, it } from "vitest";

import type { LogRecord, OtlpLogsResponse } from "@/models";

import { createLogsResponse } from "./logs-bff";

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
      createSearchParams(),
    );

    expect(response.rows[0]).toMatchObject({
      service: "checkout-api",
      scopeName: "my.library",
      severity: "Information",
      message: "ok",
      resourceAttributes: {
        "service.name": "checkout-api",
        "service.namespace": "payments",
      },
      scopeAttributes: {
        "scope.kind": "runtime",
      },
      logAttributes: {
        "http.status_code": "500",
      },
      traceId: "5B8EFFF798038103D269B633813FC60C",
      spanId: "EEE19B7EC3C1B174",
    });
    expect(response.rows[0]?.time).not.toBe("Unknown time");
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
      resourceAttributes: {},
      scopeAttributes: {},
      logAttributes: {},
    });
  });
});
