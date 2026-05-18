import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

function createRequest(url = "http://localhost/api/logs") {
  return new NextRequest(url);
}

describe("GET /api/logs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 503 when OTLP_API_URL is missing", async () => {
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

  it("returns successful upstream JSON unchanged", async () => {
    vi.stubEnv("OTLP_API_URL", "https://otlp.example.com/logs");
    const logs = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: {
                  stringValue: "my.service",
                },
              },
            ],
          },
          scopeLogs: [],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(logs)));

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(logs);
  });

  it("returns 502 when the upstream response is unsuccessful", async () => {
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

  it("returns 502 when upstream JSON cannot be parsed", async () => {
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
