import { type NextRequest, NextResponse } from "next/server";

import type { LogsViewResponse } from "@/models";

import { createLogsViewResponse } from "../logs-bff";
import { fetchOtlpLogs, type LogsErrorResponse } from "../route-utils";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LogsViewResponse | LogsErrorResponse>> {
  const logs = await fetchOtlpLogs(request.nextUrl.searchParams);

  if (logs instanceof NextResponse) {
    return logs;
  }

  return NextResponse.json(
    createLogsViewResponse(logs, request.nextUrl.searchParams),
  );
}
