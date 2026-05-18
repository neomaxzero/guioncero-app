import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LogRecord, OtlpLogsResponse } from "@/models";

import { GET } from "./route";

function createRequest(url = "http://localhost/api/logs/view") {
  return new NextRequest(url);
}

function createLogRecord(
  message: string,
  overrides: Partial<LogRecord> = {},
): LogRecord {
  return {
    timeUnixNano: "1767270600000000000",
    observedTimeUnixNano: "1767270600000000000",
    severityText: "Information",
    body: {
      stringValue: message,
    },
    attributes: [],
    droppedAttributesCount: 0,
    ...overrides,
  };
}

function createLogs(logRecords: LogRecord[]): OtlpLogsResponse {
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

describe("GET /api/logs/view", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 500 when OTLP_API_URL is missing", async () => {
    vi.stubEnv("OTLP_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "logs_upstream_not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses one upstream payload for rows and histogram", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        createLogs([
          createLogRecord("error", {
            severityText: "Error",
          }),
          createLogRecord("info"),
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      createRequest("http://localhost/api/logs/view?field=message"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      total: 2,
      filtered: 2,
      rows: [
        {
          message: "error",
          severityTone: "error",
        },
        {
          message: "info",
          severityTone: "info",
        },
      ],
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
    expect(body.rows.map((row: { histogramBucketStart: string }) => row.histogramBucketStart)).toEqual([
      body.histogram.buckets[0].start,
      body.histogram.buckets[0].start,
    ]);
  });

  it("forwards filters but keeps field params inside the BFF", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs?existing=1");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        resourceLogs: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      createRequest(
        "http://localhost/api/logs/view?service=my.service&view=grouped&field=message&groupedField=count",
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://otlp.example.com/logs?existing=1&service=my.service",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),
    );
  });
});
