import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_VISIBLE_GROUPED_LOG_FIELD_IDS,
  DEFAULT_VISIBLE_LOG_FIELD_IDS,
} from "@/models";

import {
  DEFAULT_GROUPED_TABLE_SORTING,
  DEFAULT_TABLE_SORTING,
  getNextVisibleGroupedLogFieldIds,
  getNextVisibleLogFieldIds,
  partializeSettings,
  useSettings,
  type SettingsState,
} from "./use-settings";

describe("useSettings", () => {
  it("uses the default log table fields", () => {
    expect(useSettings.getState().visibleLogFieldIds).toEqual([
      ...DEFAULT_VISIBLE_LOG_FIELD_IDS,
    ]);
    expect(useSettings.getState().visibleGroupedLogFieldIds).toEqual([
      ...DEFAULT_VISIBLE_GROUPED_LOG_FIELD_IDS,
    ]);
  });

  it("persists only the settings data shape", () => {
    const state: SettingsState = {
      groupedTableSorting: [{ id: "count", desc: true }],
      logsViewMode: "grouped",
      tableSorting: [{ id: "time", desc: false }],
      visibleGroupedLogFieldIds: ["service", "count"],
      visibleLogFieldIds: ["severity", "message"],
      setGroupedTableSorting: vi.fn(),
      setLogsViewMode: vi.fn(),
      setTableSorting: vi.fn(),
      setVisibleGroupedLogFieldIds: vi.fn(),
      setVisibleLogFieldIds: vi.fn(),
      toggleGroupedLogField: vi.fn(),
      toggleLogField: vi.fn(),
    };

    expect(partializeSettings(state)).toEqual({
      groupedTableSorting: [{ id: "count", desc: true }],
      logsViewMode: "grouped",
      tableSorting: [{ id: "time", desc: false }],
      visibleGroupedLogFieldIds: ["service", "count"],
      visibleLogFieldIds: ["severity", "message"],
    });
  });

  it("uses the default table sorting", () => {
    expect(useSettings.getState().tableSorting).toEqual(DEFAULT_TABLE_SORTING);
    expect(useSettings.getState().groupedTableSorting).toEqual(
      DEFAULT_GROUPED_TABLE_SORTING,
    );
  });

  it("does not hide the final visible log field", () => {
    expect(getNextVisibleLogFieldIds(["severity"], "severity")).toEqual([
      "severity",
    ]);
    expect(getNextVisibleGroupedLogFieldIds(["service"], "service")).toEqual([
      "service",
    ]);
  });

  it("adds fields in registry order", () => {
    expect(getNextVisibleLogFieldIds(["message"], "severity")).toEqual([
      "severity",
      "message",
    ]);
    expect(getNextVisibleGroupedLogFieldIds(["info"], "service")).toEqual([
      "service",
      "info",
    ]);
  });

  it("publishes one settings update for one field toggle", () => {
    useSettings
      .getState()
      .setVisibleLogFieldIds([...DEFAULT_VISIBLE_LOG_FIELD_IDS]);
    let updates = 0;
    const unsubscribe = useSettings.subscribe(() => {
      updates += 1;
    });

    try {
      useSettings.getState().toggleLogField("traceId");

      expect(updates).toBe(1);
      expect(useSettings.getState().visibleLogFieldIds).toEqual([
        ...DEFAULT_VISIBLE_LOG_FIELD_IDS,
        "traceId",
      ]);
    } finally {
      unsubscribe();
      useSettings
        .getState()
        .setVisibleLogFieldIds([...DEFAULT_VISIBLE_LOG_FIELD_IDS]);
    }
  });

  it("does not publish a settings update when toggling off the final field", () => {
    useSettings.getState().setVisibleLogFieldIds(["severity"]);
    let updates = 0;
    const unsubscribe = useSettings.subscribe(() => {
      updates += 1;
    });

    try {
      useSettings.getState().toggleLogField("severity");

      expect(updates).toBe(0);
      expect(useSettings.getState().visibleLogFieldIds).toEqual(["severity"]);
    } finally {
      unsubscribe();
      useSettings
        .getState()
        .setVisibleLogFieldIds([...DEFAULT_VISIBLE_LOG_FIELD_IDS]);
    }
  });

  it("publishes one settings update for one sorting change", () => {
    useSettings.getState().setTableSorting(DEFAULT_TABLE_SORTING);
    let updates = 0;
    const unsubscribe = useSettings.subscribe(() => {
      updates += 1;
    });

    try {
      useSettings.getState().setTableSorting([{ id: "service", desc: false }]);

      expect(updates).toBe(1);
      expect(useSettings.getState().tableSorting).toEqual([
        { id: "service", desc: false },
      ]);
    } finally {
      unsubscribe();
      useSettings.getState().setTableSorting(DEFAULT_TABLE_SORTING);
    }
  });

  it("clears sorting when the sorted field is hidden", () => {
    useSettings
      .getState()
      .setVisibleLogFieldIds([...DEFAULT_VISIBLE_LOG_FIELD_IDS, "traceId"]);
    useSettings.getState().setTableSorting([{ id: "traceId", desc: false }]);

    try {
      useSettings.getState().toggleLogField("traceId");

      expect(useSettings.getState().tableSorting).toEqual([]);
    } finally {
      useSettings.getState().setTableSorting(DEFAULT_TABLE_SORTING);
      useSettings
        .getState()
        .setVisibleLogFieldIds([...DEFAULT_VISIBLE_LOG_FIELD_IDS]);
    }
  });

  it("keeps grouped settings separate from detailed log settings", () => {
    useSettings.getState().setVisibleLogFieldIds(["severity", "message"]);
    useSettings.getState().setVisibleGroupedLogFieldIds(["service", "count"]);
    useSettings.getState().setTableSorting([{ id: "message", desc: false }]);
    useSettings
      .getState()
      .setGroupedTableSorting([{ id: "count", desc: true }]);

    try {
      useSettings.getState().setLogsViewMode("grouped");
      useSettings.getState().toggleGroupedLogField("error");

      expect(useSettings.getState().logsViewMode).toBe("grouped");
      expect(useSettings.getState().visibleLogFieldIds).toEqual([
        "severity",
        "message",
      ]);
      expect(useSettings.getState().tableSorting).toEqual([
        { id: "message", desc: false },
      ]);
      expect(useSettings.getState().visibleGroupedLogFieldIds).toEqual([
        "service",
        "count",
        "error",
      ]);
      expect(useSettings.getState().groupedTableSorting).toEqual([
        { id: "count", desc: true },
      ]);
    } finally {
      useSettings.getState().setLogsViewMode("logs");
      useSettings.getState().setTableSorting(DEFAULT_TABLE_SORTING);
      useSettings
        .getState()
        .setGroupedTableSorting(DEFAULT_GROUPED_TABLE_SORTING);
      useSettings
        .getState()
        .setVisibleLogFieldIds([...DEFAULT_VISIBLE_LOG_FIELD_IDS]);
      useSettings
        .getState()
        .setVisibleGroupedLogFieldIds([...DEFAULT_VISIBLE_GROUPED_LOG_FIELD_IDS]);
    }
  });

  it("does not hide the final visible grouped field", () => {
    useSettings.getState().setVisibleGroupedLogFieldIds(["service"]);
    let updates = 0;
    const unsubscribe = useSettings.subscribe(() => {
      updates += 1;
    });

    try {
      useSettings.getState().toggleGroupedLogField("service");

      expect(updates).toBe(0);
      expect(useSettings.getState().visibleGroupedLogFieldIds).toEqual([
        "service",
      ]);
    } finally {
      unsubscribe();
      useSettings
        .getState()
        .setVisibleGroupedLogFieldIds([...DEFAULT_VISIBLE_GROUPED_LOG_FIELD_IDS]);
    }
  });
});
