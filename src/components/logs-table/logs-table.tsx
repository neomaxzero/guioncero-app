"use client";

import { useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useLogs } from "@/data/use-logs";
import {
  getSeverityPresentation,
  severityToneBadgeClassNames,
} from "@/lib/log-severity";
import { cn } from "@/lib/utils";
import type { LogRow } from "@/models";

const columns: ColumnDef<LogRow>[] = [
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <SeverityBadge row={row.original} />,
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ getValue }) => (
      <span className="block truncate text-muted-foreground transition-colors group-hover:text-foreground">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "service",
    header: "Service",
    cell: ({ getValue }) => (
      <span className="block truncate" title={getValue<string>()}>
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ getValue }) => (
      <span
        className="block truncate font-mono text-[12px] leading-5"
        title={getValue<string>()}
      >
        {getValue<string>()}
      </span>
    ),
  },
];

const skeletonRows = Array.from({ length: 20 }, (_, index) => index);
const skeletonColumnIds = ["severity", "time", "service", "message"];
const skeletonCellWidths = ["w-14", "w-36", "w-28", "w-full"];
const LOG_ROW_HEIGHT = 34;
const TABLE_GRID_COLUMNS =
  "grid-cols-[7rem_13rem_12rem_minmax(22rem,1fr)]";

export function LogsTable() {
  const { data, error, isError, isFetching, isLoading, refetch } = useLogs();
  const scrollParentRef = useRef<HTMLDivElement>(null);
  // TanStack Table exposes dynamic functions, so this opts out of compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => LOG_ROW_HEIGHT,
    getItemKey: (index) => rows[index]?.original.id ?? index,
    getScrollElement: () => scrollParentRef.current,
    overscan: 12,
  });

  return (
    <section className="min-h-0 flex-1 px-3 py-2 sm:px-4 sm:py-3">
      <div
        ref={scrollParentRef}
        className="h-full min-h-0 overflow-auto rounded-md border bg-background"
      >
        <table
          aria-busy={isFetching}
          className="grid w-full min-w-[54rem] caption-bottom text-[12px]"
        >
          <thead className="sticky top-0 z-10 grid bg-background shadow-[0_1px_0_0_var(--border)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className={cn("grid h-8", TABLE_GRID_COLUMNS)}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={getHeaderColumnClassName(header.column.id)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            className="relative grid"
            style={{
              height:
                !isLoading && !isError && rows.length > 0
                  ? `${rowVirtualizer.getTotalSize()}px`
                  : undefined,
            }}
          >
            {isLoading ? <LogsTableSkeleton /> : null}
            {isError && !isLoading ? (
              <LogsTableFeedback
                message={error?.message ?? "Logs could not be loaded."}
                actionLabel={isFetching ? "Retrying..." : "Retry"}
                actionDisabled={isFetching}
                onAction={() => void refetch()}
              />
            ) : null}
            {!isLoading && !isError && rows.length === 0 ? (
              <LogsTableFeedback message="No logs found" />
            ) : null}
            {!isLoading && !isError
              ? rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];

                  if (!row) {
                    return null;
                  }

                  return (
                    <tr
                      key={row.original.id}
                      className={cn(
                        "group absolute grid w-full border-b text-foreground transition-colors hover:bg-muted/50",
                        TABLE_GRID_COLUMNS,
                      )}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={getBodyColumnClassName(cell.column.id)}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogsTableSkeleton() {
  return skeletonRows.map((row) => (
    <tr
      key={row}
      className={cn("grid border-b hover:bg-transparent", TABLE_GRID_COLUMNS)}
      style={{ height: `${LOG_ROW_HEIGHT}px` }}
    >
      {skeletonCellWidths.map((width, cellIndex) => (
        <td
          key={`${row}-${cellIndex}`}
          className={getBodyColumnClassName(skeletonColumnIds[cellIndex])}
        >
          <span
            className={cn("block h-3 animate-pulse rounded-sm bg-muted", width)}
          />
        </td>
      ))}
    </tr>
  ));
}

function LogsTableFeedback({
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
    <tr className={cn("grid hover:bg-transparent", TABLE_GRID_COLUMNS)}>
      <td className="col-span-4 flex h-24 items-center justify-center text-center">
        <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
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
      </td>
    </tr>
  );
}

function SeverityBadge({ row }: { row: LogRow }) {
  const severity = getSeverityPresentation(row);

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[3.8rem] items-center justify-center rounded-sm border px-1.5 font-mono text-[10px] font-semibold",
        severityToneBadgeClassNames[severity.tone],
      )}
    >
      {severity.label}
    </span>
  );
}

function getHeaderColumnClassName(columnId: string): string {
  return cn(
    "flex h-8 min-w-0 items-center border-r px-2 text-left align-middle text-[11px] font-medium text-muted-foreground last:border-r-0",
    getColumnAlignmentClassName(columnId),
  );
}

function getBodyColumnClassName(columnId: string): string {
  return cn(
    "flex min-w-0 items-center border-r px-2 py-0 align-middle last:border-r-0",
    getColumnAlignmentClassName(columnId),
  );
}

function getColumnAlignmentClassName(columnId: string): string {
  if (columnId === "severity") {
    return "justify-start";
  }

  return "";
}
