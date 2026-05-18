import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LogRecord, OtlpLogsResponse } from "@/models";

import { GET } from "./route";

function createRequest(url = "http://localhost/api/logs") {
  return new NextRequest(url);
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

describe("GET /api/logs", () => {
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
        "http://localhost/api/logs?service=my.service&severity=error&severity=warn",
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://otlp.example.com/logs?existing=1&service=my.service&severity=error&severity=warn",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }),
    );
  });

  it("uses field params only for BFF projection", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs?existing=1");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        resourceLogs: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      createRequest(
        "http://localhost/api/logs?service=my.service&field=traceId&field=message",
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

  it("returns successful upstream JSON as flattened rows with counts", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    const logs = createLogs([createLogRecord("first")]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(logs)));

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      rows: [
        {
          service: "checkout-api",
          severity: "Information",
          message: "first",
        },
      ],
      total: 1,
      filtered: 1,
    });
  });

  it("does not cap rows at 20 unless limit is provided", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    const logs = createLogs(
      Array.from({ length: 25 }, (_, index) => createLogRecord(`log-${index}`)),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(logs)));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      total: 25,
      filtered: 25,
    });
    expect(body.rows).toHaveLength(25);
  });

  it("applies limit after BFF filtering while preserving counts", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    const logs = createLogs(
      Array.from({ length: 25 }, (_, index) =>
        createLogRecord(`log-${index}`, {
          severityText: index % 2 === 0 ? "Error" : "Information",
        }),
      ),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(logs)));

    const response = await GET(
      createRequest("http://localhost/api/logs?severity=error&limit=4"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      total: 25,
      filtered: 13,
    });
    expect(body.rows.map((row: { message: string }) => row.message)).toEqual([
      "log-0",
      "log-2",
      "log-4",
      "log-6",
    ]);
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
