"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingFn,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useLogs } from "@/data/use-logs";
import {
  getSeverityPresentation,
  severityToneBadgeClassNames,
} from "@/lib/log-severity";
import { cn } from "@/lib/utils";
import {
  LOG_FIELD_DEFINITIONS,
  getLogFieldDefinition,
  type LogFieldDefinition,
  type LogFieldId,
  type LogRow,
} from "@/models";
import { useSettings } from "@/settings/use-settings";

const skeletonRows = Array.from({ length: 20 }, (_, index) => index);
const LOG_ROW_HEIGHT = 34;
const EMPTY_LOG_ROWS: LogRow[] = [];

export function LogsTable() {
  const tableSorting = useSettings((state) => state.tableSorting);
  const setTableSorting = useSettings((state) => state.setTableSorting);
  const visibleLogFieldIds = useSettings((state) => state.visibleLogFieldIds);
  const toggleLogField = useSettings((state) => state.toggleLogField);
  const visibleFieldDefinitions = useMemo(
    () => visibleLogFieldIds.map(getLogFieldDefinition),
    [visibleLogFieldIds],
  );
  const columns = useMemo(
    () => visibleFieldDefinitions.map(createLogColumn),
    [visibleFieldDefinitions],
  );
  const tableGridStyle = useMemo<CSSProperties>(
    () => ({
      gridTemplateColumns: visibleFieldDefinitions
        .map((field) => field.width)
        .join(" "),
    }),
    [visibleFieldDefinitions],
  );
  const tableMinWidth = useMemo(
    () =>
      Math.max(
        30,
        visibleFieldDefinitions.reduce(
          (total, field) => total + field.minWidthRem,
          0,
        ),
      ),
    [visibleFieldDefinitions],
  );
  const { data, error, isError, isFetching, isLoading, refetch } = useLogs();
  const tableRows = data?.rows ?? EMPTY_LOG_ROWS;
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const handleSortingChange = useCallback(
    (updater: SortingState | ((sorting: SortingState) => SortingState)) => {
      setTableSorting(
        functionalUpdate(updater, tableSorting as SortingState),
      );
    },
    [setTableSorting, tableSorting],
  );
  // TanStack Table exposes dynamic functions, so this opts out of compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tableRows,
    columns,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: handleSortingChange,
    state: {
      sorting: tableSorting,
    },
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
    <section className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex h-7 shrink-0 items-center justify-end">
        <LogsTableSettings
          visibleLogFieldIds={visibleLogFieldIds}
          onToggleLogField={toggleLogField}
        />
      </div>
      <div
        ref={scrollParentRef}
        className="min-h-0 flex-1 overflow-auto rounded-md border bg-background"
      >
        <table
          aria-busy={isFetching}
          className="grid w-full caption-bottom text-[12px]"
          style={{ minWidth: `${tableMinWidth}rem` }}
        >
          <thead className="sticky top-0 z-10 grid bg-background shadow-[0_1px_0_0_var(--border)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="grid h-8" style={tableGridStyle}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={getHeaderColumnClassName(header.column.id)}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex h-full min-w-0 flex-1 items-center gap-1 text-left"
                      >
                        <span className="min-w-0 truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                        <SortIndicator sortDirection={header.column.getIsSorted()} />
                      </button>
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
            {isLoading ? (
              <LogsTableSkeleton
                fieldDefinitions={visibleFieldDefinitions}
                gridStyle={tableGridStyle}
              />
            ) : null}
            {isError && !isLoading ? (
              <LogsTableFeedback
                gridStyle={tableGridStyle}
                message={error?.message ?? "Logs could not be loaded."}
                actionLabel={isFetching ? "Retrying..." : "Retry"}
                actionDisabled={isFetching}
                onAction={() => void refetch()}
              />
            ) : null}
            {!isLoading && !isError && rows.length === 0 ? (
              <LogsTableFeedback
                gridStyle={tableGridStyle}
                message="No logs found"
              />
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
                      className="group absolute grid w-full border-b text-foreground transition-colors hover:bg-muted/50"
                      style={{
                        ...tableGridStyle,
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

function createLogColumn(field: LogFieldDefinition): ColumnDef<LogRow> {
  return {
    id: field.id,
    header: field.label,
    accessorFn: (row) => getLogFieldValue(row, field.id as LogFieldId),
    cell: ({ getValue, row }) =>
      renderLogCell(
        field.id as LogFieldId,
        row.original,
        getValue<string | undefined>(),
      ),
    sortDescFirst: field.id === "time",
    sortUndefined: "last",
    sortingFn: logFieldSortingFn,
  };
}

const logFieldSortingFn: SortingFn<LogRow> = (leftRow, rightRow, columnId) =>
  compareSortableValues(
    getSortableLogFieldValue(leftRow.original, columnId as LogFieldId),
    getSortableLogFieldValue(rightRow.original, columnId as LogFieldId),
  );

function SortIndicator({
  sortDirection,
}: {
  sortDirection: false | "asc" | "desc";
}) {
  return (
    <span
      aria-hidden="true"
      className="w-3 shrink-0 text-right font-mono text-[10px] text-muted-foreground"
    >
      {sortDirection === "asc" ? "^" : sortDirection === "desc" ? "v" : ""}
    </span>
  );
}

function LogsTableSettings({
  onToggleLogField,
  visibleLogFieldIds,
}: {
  onToggleLogField: (fieldId: LogFieldId) => void;
  visibleLogFieldIds: readonly LogFieldId[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const visibleFieldIdSet = useMemo(
    () => new Set(visibleLogFieldIds),
    [visibleLogFieldIds],
  );
  const visibleCount = visibleLogFieldIds.length;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !settingsRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={settingsRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-7 items-center gap-2 rounded-md border bg-background px-2.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted active:scale-[0.98]"
      >
        <span>Columns</span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {visibleCount}
        </span>
      </button>
      {isOpen ? (
        <div
          role="menu"
          aria-label="Table columns"
          className="absolute right-0 top-8 z-20 w-64 rounded-md border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <div className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-muted-foreground">
            {visibleCount} visible
          </div>
          {LOG_FIELD_DEFINITIONS.map((field) => {
            const isVisible = visibleFieldIdSet.has(field.id);
            const isLastVisibleField = isVisible && visibleCount === 1;

            return (
              <label
                key={field.id}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-xs transition-colors hover:bg-muted",
                  isLastVisibleField && "cursor-default opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  disabled={isLastVisibleField}
                  onChange={() => onToggleLogField(field.id)}
                  className="size-3.5 accent-foreground"
                />
                <span className="min-w-0 truncate">{field.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LogsTableSkeleton({
  fieldDefinitions,
  gridStyle,
}: {
  fieldDefinitions: readonly LogFieldDefinition[];
  gridStyle: CSSProperties;
}) {
  return skeletonRows.map((row) => (
    <tr
      key={row}
      className="grid border-b hover:bg-transparent"
      style={{ ...gridStyle, height: `${LOG_ROW_HEIGHT}px` }}
    >
      {fieldDefinitions.map((field) => (
        <td key={`${row}-${field.id}`} className={getBodyColumnClassName(field.id)}>
          <span
            className={cn(
              "block h-3 animate-pulse rounded-sm bg-muted",
              field.skeletonWidthClassName,
            )}
          />
        </td>
      ))}
    </tr>
  ));
}

function LogsTableFeedback({
  actionDisabled,
  actionLabel,
  gridStyle,
  message,
  onAction,
}: {
  actionDisabled?: boolean;
  actionLabel?: string;
  gridStyle: CSSProperties;
  message: string;
  onAction?: () => void;
}) {
  return (
    <tr className="grid hover:bg-transparent" style={gridStyle}>
      <td
        className="flex h-24 items-center justify-center text-center"
        style={{ gridColumn: "1 / -1" }}
      >
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

function renderLogCell(
  fieldId: LogFieldId,
  row: LogRow,
  value: string | undefined,
) {
  if (fieldId === "severity") {
    return <SeverityBadge row={row} />;
  }

  if (!value) {
    return <EmptyCell />;
  }

  if (fieldId === "time") {
    return (
      <span className="block truncate text-muted-foreground transition-colors group-hover:text-foreground">
        {value}
      </span>
    );
  }

  if (fieldId === "message") {
    return (
      <span
        className="block truncate font-mono text-[12px] leading-5"
        title={value}
      >
        {value}
      </span>
    );
  }

  if (fieldId === "traceId" || fieldId === "spanId") {
    return (
      <span className="block truncate font-mono text-[11px]" title={value}>
        {value}
      </span>
    );
  }

  return (
    <span className="block truncate" title={value}>
      {value}
    </span>
  );
}

function EmptyCell() {
  return <span className="block text-muted-foreground/60">-</span>;
}

function getLogFieldValue(row: LogRow, fieldId: LogFieldId): string | undefined {
  if (fieldId === "severity") {
    return row.severity;
  }

  if (fieldId === "time") {
    return row.time;
  }

  if (fieldId === "service") {
    return row.service;
  }

  if (fieldId === "message") {
    return row.message;
  }

  if (fieldId === "traceId") {
    return row.traceId;
  }

  if (fieldId === "spanId") {
    return row.spanId;
  }

  if (fieldId === "scopeName") {
    return row.scopeName;
  }

  if (fieldId === "resource.service.namespace") {
    return row.resourceAttributes?.["service.namespace"];
  }

  if (fieldId === "resource.service.version") {
    return row.resourceAttributes?.["service.version"];
  }

  if (fieldId === "log.http.route") {
    return row.logAttributes?.["http.route"];
  }

  return row.logAttributes?.["http.status_code"];
}

function getSortableLogFieldValue(
  row: LogRow,
  fieldId: LogFieldId,
): bigint | number | string | undefined {
  if (fieldId === "time") {
    return unixNanoToBigInt(row.timeUnixNano) ?? row.time;
  }

  if (fieldId === "severity") {
    return row.severityNumber ?? row.severity?.toLocaleLowerCase();
  }

  if (fieldId === "log.http.status_code") {
    return toSortableNumber(row.logAttributes?.["http.status_code"]);
  }

  return getLogFieldValue(row, fieldId)?.toLocaleLowerCase();
}

function compareSortableValues(
  left: bigint | number | string | undefined,
  right: bigint | number | string | undefined,
): number {
  if (left === undefined && right === undefined) {
    return 0;
  }

  if (left === undefined) {
    return 1;
  }

  if (right === undefined) {
    return -1;
  }

  if (typeof left === "string" || typeof right === "string") {
    return String(left).localeCompare(String(right));
  }

  if (left === right) {
    return 0;
  }

  return left > right ? 1 : -1;
}

function unixNanoToBigInt(
  timeUnixNano: LogRow["timeUnixNano"],
): bigint | undefined {
  if (typeof timeUnixNano === "string") {
    try {
      return BigInt(timeUnixNano);
    } catch {
      return undefined;
    }
  }

  if (typeof timeUnixNano === "number" && Number.isFinite(timeUnixNano)) {
    return BigInt(Math.trunc(timeUnixNano));
  }

  return undefined;
}

function toSortableNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
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
