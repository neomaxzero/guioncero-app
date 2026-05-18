import { describe, expect, it } from "vitest";

import type { LogRecord, LogsResponse } from "@/models";

import { createLogTableRows } from "./log-rows";

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

function createLogsResponse(logRecords: LogRecord[]): LogsResponse {
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
          ],
          droppedAttributesCount: 0,
        },
        scopeLogs: [
          {
            logRecords,
          },
        ],
      },
    ],
  };
}

describe("createLogTableRows", () => {
  it("preserves upstream order when flattening resources and scopes", () => {
    const logs: LogsResponse = {
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
              logRecords: [createLogRecord("third")],
            },
          ],
        },
      ],
    };

    expect(createLogTableRows(logs).map((row) => row.message)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("caps the table rows at 20 logs", () => {
    const logs = createLogsResponse(
      Array.from({ length: 25 }, (_, index) => createLogRecord(`log-${index}`)),
    );

    const rows = createLogTableRows(logs);

    expect(rows).toHaveLength(20);
    expect(rows.at(-1)?.message).toBe("log-19");
  });

  it("extracts service.name from resource attributes", () => {
    const rows = createLogTableRows(createLogsResponse([createLogRecord("ok")]));

    expect(rows[0]).toMatchObject({
      service: "checkout-api",
      severity: "Information",
      message: "ok",
    });
    expect(rows[0].time).not.toBe("Unknown time");
  });

  it("uses compact fallbacks for sparse log records", () => {
    const logs = createLogsResponse([
      createLogRecord("", {
        timeUnixNano: "not-a-number",
        severityText: "",
        severityNumber: undefined,
        body: undefined,
      }),
    ]);
    if (logs.resourceLogs?.[0]) {
      logs.resourceLogs[0].resource = undefined;
    }

    expect(createLogTableRows(logs)[0]).toMatchObject({
      time: "Unknown time",
      severity: "Unspecified",
      service: "unknown service",
      message: "No message",
    });
  });

  it("renders primitive OTLP body values compactly", () => {
    const rows = createLogTableRows(
      createLogsResponse([
        createLogRecord("", {
          body: {
            boolValue: true,
          },
        }),
      ]),
    );

    expect(rows[0].message).toBe("true");
  });

  it("handles missing OTLP collections", () => {
    const logs = {
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: undefined,
            },
          ],
        },
        {
          scopeLogs: undefined,
        },
      ],
    } as LogsResponse;

    expect(createLogTableRows(undefined)).toEqual([]);
    expect(createLogTableRows({})).toEqual([]);
    expect(createLogTableRows(logs)).toEqual([]);
  });
});
