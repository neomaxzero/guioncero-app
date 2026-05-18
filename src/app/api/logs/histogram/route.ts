import { type NextRequest, NextResponse } from "next/server";

import type { LogsHistogramResponse } from "@/models";

import { createLogsHistogramResponse } from "../logs-bff";
import { fetchOtlpLogs, type LogsErrorResponse } from "../route-utils";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LogsHistogramResponse | LogsErrorResponse>> {
  const logs = await fetchOtlpLogs(request.nextUrl.searchParams);

  if (logs instanceof NextResponse) {
    return logs;
  }

  return NextResponse.json(
    createLogsHistogramResponse(logs, request.nextUrl.searchParams),
  );
}
