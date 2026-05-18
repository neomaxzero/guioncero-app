import { type NextRequest, NextResponse } from "next/server";

import type { LogsResponse } from "@/models";

import { createLogsResponse } from "./logs-bff";
import { fetchOtlpLogs, type LogsErrorResponse } from "./route-utils";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LogsResponse | LogsErrorResponse>> {
  const logs = await fetchOtlpLogs(request.nextUrl.searchParams);

  if (logs instanceof NextResponse) {
    return logs;
  }

  return NextResponse.json(
    createLogsResponse(logs, request.nextUrl.searchParams),
  );
}
