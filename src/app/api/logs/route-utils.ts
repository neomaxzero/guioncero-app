import { NextResponse } from "next/server";

import type { OtlpLogsResponse } from "@/models";

export type LogsErrorResponse = {
  error: string;
  message: string;
  upstreamStatus?: number;
};

export function createErrorResponse(
  body: LogsErrorResponse,
  status: number,
): NextResponse<LogsErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function fetchOtlpLogs(
  searchParams: URLSearchParams,
): Promise<OtlpLogsResponse | NextResponse<LogsErrorResponse>> {
  const upstreamUrl = createUpstreamUrl(process.env.OTLP_API_URL, searchParams);

  if (!upstreamUrl) {
    return createErrorResponse(
      {
        error: "logs_upstream_not_configured",
        message: "OTLP_API_URL must be configured to fetch logs.",
      },
      500,
    );
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return createErrorResponse(
        {
          error: "logs_upstream_failed",
          message: "The logs upstream returned an unsuccessful response.",
          upstreamStatus: upstreamResponse.status,
        },
        500,
      );
    }

    return (await upstreamResponse.json()) as OtlpLogsResponse;
  } catch {
    return createErrorResponse(
      {
        error: "logs_upstream_failed",
        message: "The logs upstream response could not be read.",
      },
      500,
    );
  }
}

function createUpstreamUrl(
  otlpApiUrl: string | undefined,
  searchParams: URLSearchParams,
): URL | null {
  const rawUrl = otlpApiUrl?.trim();

  if (!rawUrl) {
    return null;
  }

  try {
    const upstreamUrl = new URL(rawUrl);

    searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.append(key, value);
    });

    return upstreamUrl;
  } catch {
    return null;
  }
}
