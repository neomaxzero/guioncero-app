"use client";

import { useState } from "react";

import { LogsHistogram } from "@/components/logs-histogram";
import { LogsTable } from "@/components/logs-table";
import { useLogsView } from "@/data/use-logs-view";
import { useSettings } from "@/settings/use-settings";

export function LogsWorkspace() {
  const [activeHistogramBucketStart, setActiveHistogramBucketStart] = useState<
    string | null
  >(null);
  const logsViewMode = useSettings((state) => state.logsViewMode);
  const logsViewQuery = useLogsView();

  return (
    <>
      <LogsHistogram
        activeBucketStart={
          logsViewMode === "logs" ? activeHistogramBucketStart : null
        }
        data={logsViewQuery.data?.histogram}
        error={logsViewQuery.error}
        isError={logsViewQuery.isError}
        isFetching={logsViewQuery.isFetching}
        isLoading={logsViewQuery.isLoading}
        logsViewMode={logsViewMode}
        onActiveBucketChange={setActiveHistogramBucketStart}
        refetch={logsViewQuery.refetch}
      />
      <LogsTable
        activeBucketStart={activeHistogramBucketStart}
        data={logsViewQuery.data}
        error={logsViewQuery.error}
        isError={logsViewQuery.isError}
        isFetching={logsViewQuery.isFetching}
        isLoading={logsViewQuery.isLoading}
        refetch={logsViewQuery.refetch}
      />
    </>
  );
}
