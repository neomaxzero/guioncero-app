import { describe, expect, it, vi } from "vitest";

import { DEFAULT_VISIBLE_LOG_FIELD_IDS } from "@/models";

import {
  DEFAULT_TABLE_SORTING,
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
  });

  it("persists only the settings data shape", () => {
    const state: SettingsState = {
      tableSorting: [{ id: "time", desc: false }],
      visibleLogFieldIds: ["severity", "message"],
      setTableSorting: vi.fn(),
      setVisibleLogFieldIds: vi.fn(),
      toggleLogField: vi.fn(),
    };

    expect(partializeSettings(state)).toEqual({
      tableSorting: [{ id: "time", desc: false }],
      visibleLogFieldIds: ["severity", "message"],
    });
  });

  it("uses the default table sorting", () => {
    expect(useSettings.getState().tableSorting).toEqual(DEFAULT_TABLE_SORTING);
  });

  it("does not hide the final visible log field", () => {
    expect(getNextVisibleLogFieldIds(["severity"], "severity")).toEqual([
      "severity",
    ]);
  });

  it("adds fields in registry order", () => {
    expect(getNextVisibleLogFieldIds(["message"], "severity")).toEqual([
      "severity",
      "message",
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
});
