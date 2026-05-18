# Basic Logs Table

## Summary

Render the first 20 OTLP log records from `/api/logs` in a client-side table. Keep the feature intentionally basic: no sorting, filtering, pagination, row expansion, or BFF changes.

## Key Changes

- Add `@tanstack/react-table` and install the Shadcn table foundation component using the MCP-resolved command: `npx shadcn@latest add @shadcn/table`.
- Add a logs table feature under `src/components/logs-table`:
  - Flatten `resourceLogs -> scopeLogs -> logRecords` in upstream order.
  - Limit to the first 20 flattened records.
  - Columns: Time, Severity, Service, Message.
  - Time uses browser-local compact date/time with milliseconds.
  - Service comes from resource attribute `service.name`, falling back to `unknown service`.
  - Message comes from OTLP `body`, with primitive values rendered compactly and missing values shown as `No message`.
- Update `src/app/page.tsx` to render the table as the main workspace below `AppHeader`.
- Loading state renders a table-shaped skeleton with 20 reserved rows to avoid layout shift.
- Empty state shows a compact “No logs found” row.
- Error state shows a compact failure row with a retry button wired to React Query `refetch`.

## Interfaces

- No BFF contract change.
- Existing `useLogs()` remains the client data source.
- Add an internal `LogTableRow` shape for table rendering: `id`, `time`, `severity`, `service`, `message`.

## Test Plan

- Add fast Vitest coverage for the pure OTLP-to-table-row mapper:
  - Preserves upstream flattening order.
  - Caps output at 20 rows.
  - Extracts `service.name`.
  - Uses timestamp/body fallbacks safely.
  - Handles missing `resourceLogs`, `scopeLogs`, or `logRecords`.
- Run `npm run typecheck`, `npm run lint`, and `npm run test`.
- During implementation, start the dev server and visually verify the loading, empty, error, and populated table states.

## Assumptions

- “Top 20” means first 20 records received from the BFF, not sorted by timestamp.
- This pass does not fix the existing BFF status-code mismatch between docs and implementation.
- No E2E framework is added for this small slice; test coverage stays focused on the mapping logic.
