import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LogRecord, OtlpLogsResponse } from "@/models";

import { GET } from "./route";

function createRequest(url = "http://localhost/api/logs/histogram") {
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

describe("GET /api/logs/histogram", () => {
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

  it("forwards query params to the configured upstream URL", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs?existing=1");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        resourceLogs: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      createRequest(
        "http://localhost/api/logs/histogram?service=my.service&severity=error",
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://otlp.example.com/logs?existing=1&service=my.service&severity=error",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),
    );
  });

  it("returns a histogram response for successful upstream JSON", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    const logs = createLogs([
      createLogRecord("error", {
        severityText: "Error",
      }),
      createLogRecord("info"),
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(logs)));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      total: 2,
      buckets: [
        {
          total: 2,
          error: 1,
          info: 1,
        },
      ],
    });
  });

  it("returns 500 when the upstream response is unsuccessful", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "nope" }, { status: 500 })),
    );

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "logs_upstream_failed",
      upstreamStatus: 500,
    });
  });

  it("returns 500 when upstream JSON cannot be parsed", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not-json", {
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "logs_upstream_failed",
    });
  });
});
