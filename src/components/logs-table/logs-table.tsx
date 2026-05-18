"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { useLogs } from "@/data/use-logs";
import type { LogRow } from "@/models";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const columns: ColumnDef<LogRow>[] = [
  {
    accessorKey: "time",
    header: "Time",
  },
  {
    accessorKey: "severity",
    header: "Severity",
  },
  {
    accessorKey: "service",
    header: "Service",
  },
  {
    accessorKey: "message",
    header: "Message",
  },
];

const skeletonRows = Array.from({ length: 20 }, (_, index) => index);
const skeletonColumnIds = ["time", "severity", "service", "message"];
const skeletonCellWidths = ["w-32", "w-16", "w-28", "w-full"];

export function LogsTable() {
  const { data, error, isError, isFetching, isLoading, refetch } = useLogs();
  // TanStack Table exposes dynamic functions, so this opts out of compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="flex min-h-[calc(100dvh-2.5rem)] flex-col px-4 py-3">
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-background">
        <Table aria-busy={isFetching}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={getColumnClassName(header.column.id)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? <LogsTableSkeleton /> : null}
            {isError && !isLoading ? (
              <LogsTableFeedback
                message={error?.message ?? "Logs could not be loaded."}
                actionLabel={isFetching ? "Retrying..." : "Retry"}
                actionDisabled={isFetching}
                onAction={() => void refetch()}
              />
            ) : null}
            {!isLoading && !isError && table.getRowModel().rows.length === 0 ? (
              <LogsTableFeedback message="No logs found" />
            ) : null}
            {!isLoading && !isError
              ? table.getRowModel().rows.map((row) => (
                  <TableRow key={row.original.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={getColumnClassName(cell.column.id)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function LogsTableSkeleton() {
  return skeletonRows.map((row) => (
    <TableRow key={row} className="hover:bg-transparent">
      {skeletonCellWidths.map((width, cellIndex) => (
        <TableCell
          key={`${row}-${cellIndex}`}
          className={getColumnClassName(skeletonColumnIds[cellIndex])}
        >
          <span
            className={`block h-3 rounded-sm bg-muted ${width} animate-pulse`}
          />
        </TableCell>
      ))}
    </TableRow>
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
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns.length} className="h-24 text-center">
        <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
          <span>{message}</span>
          {onAction ? (
            <button
              type="button"
              disabled={actionDisabled}
              onClick={onAction}
              className="rounded-md border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function getColumnClassName(columnId: string): string {
  if (columnId === "time") {
    return "w-[14rem] px-3";
  }

  if (columnId === "severity") {
    return "w-[8rem] px-3";
  }

  if (columnId === "service") {
    return "w-[14rem] px-3";
  }

  if (columnId === "message") {
    return "min-w-[24rem] px-3 whitespace-normal";
  }

  return "px-3";
}
