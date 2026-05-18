"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  severityToneChartColors,
  severityToneLabels,
  severityToneOrder,
  type SeverityTone,
} from "@/lib/log-severity";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  GroupedLogsHistogramResponse,
  LogsHistogramBucket,
  LogsHistogramResponse,
  LogsViewMode,
} from "@/models";

const chartConfig = {
  error: {
    label: severityToneLabels.error,
    color: severityToneChartColors.error,
  },
  warning: {
    label: severityToneLabels.warning,
    color: severityToneChartColors.warning,
  },
  info: {
    label: severityToneLabels.info,
    color: severityToneChartColors.info,
  },
  neutral: {
    label: severityToneLabels.neutral,
    color: severityToneChartColors.neutral,
  },
} satisfies ChartConfig;

const barToneOrder = ["neutral", "info", "warning", "error"] as const;
const skeletonBars = Array.from({ length: 28 }, (_, index) => index);

type LogsHistogramProps = {
  activeBucketStart: string | null;
  data: GroupedLogsHistogramResponse | LogsHistogramResponse | undefined;
  error: Error | null;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  logsViewMode: LogsViewMode;
  onActiveBucketChange: (bucketStart: string | null) => void;
  refetch: () => unknown;
};

export function LogsHistogram({
  activeBucketStart,
  data,
  error,
  isError,
  isFetching,
  isLoading,
  logsViewMode,
  onActiveBucketChange,
  refetch,
}: LogsHistogramProps) {
  const groupedHistogram =
    logsViewMode === "grouped" && data && "services" in data ? data : undefined;
  const logsHistogram =
    logsViewMode === "logs" && data && !("services" in data) ? data : undefined;
  const hasBuckets = (logsHistogram?.buckets.length ?? 0) > 0;
  const hasGroupedBuckets = (groupedHistogram?.buckets.length ?? 0) > 0;
  const buckets = logsHistogram?.buckets ?? [];

  return (
    <section className="px-3 pt-2 sm:px-4 sm:pt-3">
      <div className="rounded-md border bg-background px-3 py-2">
        <div className="mb-2 flex min-h-5 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium text-foreground">Log volume</h2>
            {isFetching ? (
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
            ) : null}
          </div>
          {data ? (
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {data.total.toLocaleString()} logs
            </span>
          ) : null}
        </div>

        {isLoading ? <LogsHistogramSkeleton /> : null}

        {isError && !isLoading ? (
          <LogsHistogramFeedback
            message={error?.message ?? "Histogram could not be loaded."}
            actionLabel={isFetching ? "Retrying..." : "Retry"}
            actionDisabled={isFetching}
            onAction={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError && logsViewMode === "logs" && !hasBuckets ? (
          <LogsHistogramFeedback message="No timed logs found" />
        ) : null}

        {!isLoading &&
        !isError &&
        logsViewMode === "grouped" &&
        !hasGroupedBuckets ? (
          <LogsHistogramFeedback message="No timed services found" />
        ) : null}

        {!isLoading && !isError && logsViewMode === "logs" && hasBuckets ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="h-28 w-full aspect-auto"
              onPointerLeave={() => onActiveBucketChange(null)}
            >
              <BarChart
                accessibilityLayer
                data={buckets}
                margin={{
                  top: 2,
                  right: 4,
                  bottom: 0,
                  left: 0,
                }}
                barCategoryGap="18%"
              >
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tickMargin={6}
                />
                <YAxis hide width={0} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                {barToneOrder.map((tone) => (
                  <Bar
                    key={tone}
                    dataKey={tone}
                    stackId="logs"
                    fill={`var(--color-${tone})`}
                    onMouseEnter={(bucket) =>
                      onActiveBucketChange(getBucketStart(bucket))
                    }
                    radius={tone === "error" ? [2, 2, 0, 0] : undefined}
                  >
                    {buckets.map((bucket) => (
                      <Cell
                        key={`${tone}-${bucket.start}`}
                        opacity={getBucketOpacity(bucket, activeBucketStart)}
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ChartContainer>
            <LogsHistogramLegend />
          </>
        ) : null}
        {!isLoading &&
        !isError &&
        logsViewMode === "grouped" &&
        hasGroupedBuckets &&
        groupedHistogram ? (
          <GroupedServicesHistogram data={groupedHistogram} />
        ) : null}
      </div>
    </section>
  );
}

function getBucketStart(bucket: { payload?: LogsHistogramBucket }): string | null {
  return bucket.payload?.start ?? null;
}

function getBucketOpacity(
  bucket: LogsHistogramBucket,
  activeBucketStart: string | null,
): number {
  if (!activeBucketStart) {
    return 1;
  }

  return bucket.start === activeBucketStart ? 1 : 0.28;
}

function GroupedServicesHistogram({
  data,
}: {
  data: GroupedLogsHistogramResponse;
}) {
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        data.services.map((service) => [
          service.id,
          {
            label: service.service,
            color: service.color,
          },
        ]),
      ) satisfies ChartConfig,
    [data.services],
  );

  return (
    <>
      <ChartContainer config={chartConfig} className="h-28 w-full aspect-auto">
        <BarChart
          accessibilityLayer
          data={data.buckets}
          margin={{
            top: 2,
            right: 4,
            bottom: 0,
            left: 0,
          }}
          barCategoryGap="18%"
        >
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tickMargin={6}
          />
          <YAxis hide width={0} />
          {data.services.map((service) => (
            <Bar
              key={service.id}
              dataKey={(bucket: GroupedLogsHistogramResponse["buckets"][number]) =>
                bucket.services[service.id] ?? 0
              }
              stackId="services"
              fill={service.color}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <GroupedServicesLegend services={data.services} />
    </>
  );
}

function GroupedServicesLegend({
  services,
}: {
  services: GroupedLogsHistogramResponse["services"];
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {services.map((service) => (
        <span
          key={service.id}
          className="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: service.color }}
          />
          <span className="max-w-32 truncate" title={service.service}>
            {service.service}
          </span>
        </span>
      ))}
    </div>
  );
}

function LogsHistogramSkeleton() {
  return (
    <div className="flex h-28 items-end gap-1 overflow-hidden">
      {skeletonBars.map((bar) => (
        <span
          key={bar}
          className="flex-1 animate-pulse rounded-sm bg-muted"
          style={{ height: `${24 + ((bar * 17) % 72)}%` }}
        />
      ))}
    </div>
  );
}

function LogsHistogramFeedback({
  actionDisabled,
  actionLabel,
  message,
  onAction,
}: {
  actionDisabled?: boolean;
  actionLabel?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
      <div className="inline-flex items-center gap-3">
        <span>{message}</span>
        {onAction ? (
          <button
            type="button"
            disabled={actionDisabled}
            onClick={onAction}
            className="rounded-md border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LogsHistogramLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {severityToneOrder.map((tone) => (
        <LogsHistogramLegendItem key={tone} tone={tone} />
      ))}
    </div>
  );
}

function LogsHistogramLegendItem({ tone }: { tone: SeverityTone }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={cn("h-2 w-2 rounded-[2px]")}
        style={{ backgroundColor: severityToneChartColors[tone] }}
      />
      {severityToneLabels[tone]}
    </span>
  );
}
