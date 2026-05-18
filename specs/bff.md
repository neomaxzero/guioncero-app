# BFF Logs Foundation

## Summary

Build a minimal BFF foundation for logs using `/api/logs`, backed by `OTLP_API_URL`, returning the raw OTLP logs contract to the client. Keep the page UI unchanged and add only the data hook needed for future UI work.

## Key Changes

- Add `@opentelemetry/otlp-transformer` and export app log model aliases from `src/models`, importing the OTLP types from `@opentelemetry/otlp-transformer/build/src/logs/internal-types`.
- Add `GET /api/logs` as a Next route handler:
  - Treat `OTLP_API_URL` as the exact upstream URL.
  - Forward all incoming query params unchanged.
  - Return the upstream JSON as `IExportLogsServiceRequest`.
  - Return `503` JSON when `OTLP_API_URL` is missing or blank.
  - Return `502` JSON for upstream non-2xx responses or JSON parse failures.
- Add a data-provider layer with a typed fetcher and `useLogs` React Query hook, but do not render logs or alter the current home page UI yet.
- Update scripts/config to support Vitest route tests.

## Public Interfaces

- Public client endpoint: `GET /api/logs`.
- Client model contract: raw `IExportLogsServiceRequest`.
- Data hook: `useLogs()` fetches `/api/logs` and returns the raw OTLP response through React Query.

## Test Plan

- Add Vitest route tests with mocked `fetch` and env:
  - Missing `OTLP_API_URL` returns `503`.
  - Query params are forwarded to the exact upstream URL.
  - Successful upstream JSON is returned unchanged.
  - Upstream non-2xx returns `502`.
  - Invalid upstream JSON returns `502`.
- Run `npm run typecheck`, `npm run lint`, and the new test script.

## Assumptions

- `/api/logs` intentionally replaces the draft spec’s `/logs`.
- No deep OTLP runtime schema validation in this pass.
- No fallback fixture when env is missing.
- No page-level loading/error/empty UI until the next UI-facing spec.
