import { type NextRequest, NextResponse } from "next/server";

import type { LogsResponse } from "@/models";

type LogsErrorResponse = {
  error: string;
  message: string;
  upstreamStatus?: number;
};

function createErrorResponse(
  body: LogsErrorResponse,
  status: number,
): NextResponse<LogsErrorResponse> {
  return NextResponse.json(body, { status });
}

// A bit future proofing the code, we are creating a function to create the upstream URL that supports query params.
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

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LogsResponse | LogsErrorResponse>> {
  const upstreamUrl = createUpstreamUrl(
    process.env.OTLP_API_URL,
    request.nextUrl.searchParams,
  );

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

    const logs = (await upstreamResponse.json()) as LogsResponse;

    return NextResponse.json(logs);
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
