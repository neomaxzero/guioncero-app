"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_VISIBLE_GROUPED_LOG_FIELD_IDS,
  DEFAULT_VISIBLE_LOG_FIELD_IDS,
  GROUPED_LOG_FIELD_DEFINITIONS,
  LOG_FIELD_DEFINITIONS,
  isGroupedLogFieldId,
  isLogFieldId,
  type GroupedLogFieldId,
  type LogFieldId,
  type LogsViewMode,
  normalizeVisibleGroupedLogFieldIds,
  normalizeVisibleLogFieldIds,
} from "@/models";

export const SETTINGS_STORAGE_NAME = "guioncero-settings";
export const SETTINGS_STORAGE_VERSION = 2;

export type PersistedSettings = {
  groupedTableSorting: GroupedLogColumnSort[];
  logsViewMode: LogsViewMode;
  tableSorting: LogColumnSort[];
  visibleGroupedLogFieldIds: GroupedLogFieldId[];
  visibleLogFieldIds: LogFieldId[];
};

export type LogColumnSort = {
  id: LogFieldId;
  desc: boolean;
};

export type GroupedLogColumnSort = {
  id: GroupedLogFieldId;
  desc: boolean;
};

export const DEFAULT_TABLE_SORTING: LogColumnSort[] = [
  {
    id: "time",
    desc: true,
  },
];

export const DEFAULT_GROUPED_TABLE_SORTING: GroupedLogColumnSort[] = [
  {
    id: "count",
    desc: true,
  },
];

export type SettingsState = PersistedSettings & {
  setGroupedTableSorting: (sorting: readonly TableSortInput[]) => void;
  setLogsViewMode: (mode: LogsViewMode) => void;
  setTableSorting: (sorting: readonly TableSortInput[]) => void;
  setVisibleGroupedLogFieldIds: (fieldIds: readonly string[]) => void;
  setVisibleLogFieldIds: (fieldIds: readonly string[]) => void;
  toggleGroupedLogField: (fieldId: GroupedLogFieldId) => void;
  toggleLogField: (fieldId: LogFieldId) => void;
};

type TableSortInput = {
  id: string;
  desc: boolean;
};

export function getNextVisibleLogFieldIds(
  currentFieldIds: readonly string[],
  fieldId: LogFieldId,
): LogFieldId[] {
  const current = normalizeVisibleLogFieldIds(currentFieldIds);

  if (!current.includes(fieldId)) {
    return sortLogFieldIds([...current, fieldId]);
  }

  if (current.length === 1) {
    return current;
  }

  return current.filter((currentFieldId) => currentFieldId !== fieldId);
}

export function getNextVisibleGroupedLogFieldIds(
  currentFieldIds: readonly string[],
  fieldId: GroupedLogFieldId,
): GroupedLogFieldId[] {
  const current = normalizeVisibleGroupedLogFieldIds(currentFieldIds);

  if (!current.includes(fieldId)) {
    return sortGroupedLogFieldIds([...current, fieldId]);
  }

  if (current.length === 1) {
    return current;
  }

  return current.filter((currentFieldId) => currentFieldId !== fieldId);
}

export function partializeSettings(state: SettingsState): PersistedSettings {
  return {
    groupedTableSorting: state.groupedTableSorting,
    logsViewMode: state.logsViewMode,
    tableSorting: state.tableSorting,
    visibleGroupedLogFieldIds: state.visibleGroupedLogFieldIds,
    visibleLogFieldIds: state.visibleLogFieldIds,
  };
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      groupedTableSorting: [...DEFAULT_GROUPED_TABLE_SORTING],
      logsViewMode: "logs",
      tableSorting: [...DEFAULT_TABLE_SORTING],
      visibleGroupedLogFieldIds: [...DEFAULT_VISIBLE_GROUPED_LOG_FIELD_IDS],
      visibleLogFieldIds: [...DEFAULT_VISIBLE_LOG_FIELD_IDS],
      setGroupedTableSorting: (sorting) =>
        set((state) => {
          const nextSorting = normalizeGroupedTableSorting(sorting);

          if (areGroupedTableSortsEqual(state.groupedTableSorting, nextSorting)) {
            return state;
          }

          return {
            groupedTableSorting: nextSorting,
          };
        }),
      setLogsViewMode: (mode) =>
        set((state) =>
          state.logsViewMode === mode
            ? state
            : {
                logsViewMode: mode,
              },
        ),
      setTableSorting: (sorting) =>
        set((state) => {
          const nextSorting = normalizeTableSorting(sorting);

          if (areTableSortsEqual(state.tableSorting, nextSorting)) {
            return state;
          }

          return {
            tableSorting: nextSorting,
          };
        }),
      setVisibleLogFieldIds: (fieldIds) =>
        set((state) => {
          const nextFieldIds = normalizeVisibleLogFieldIds(fieldIds);

          if (areLogFieldIdsEqual(state.visibleLogFieldIds, nextFieldIds)) {
            return state;
          }

          return {
            visibleLogFieldIds: nextFieldIds,
          };
        }),
      setVisibleGroupedLogFieldIds: (fieldIds) =>
        set((state) => {
          const nextFieldIds = normalizeVisibleGroupedLogFieldIds(fieldIds);

          if (
            areGroupedLogFieldIdsEqual(
              state.visibleGroupedLogFieldIds,
              nextFieldIds,
            )
          ) {
            return state;
          }

          return {
            visibleGroupedLogFieldIds: nextFieldIds,
          };
        }),
      toggleLogField: (fieldId) =>
        set((state) => {
          const nextFieldIds = getNextVisibleLogFieldIds(
            state.visibleLogFieldIds,
            fieldId,
          );

          if (areLogFieldIdsEqual(state.visibleLogFieldIds, nextFieldIds)) {
            return state;
          }

          return {
            tableSorting:
              !nextFieldIds.includes(fieldId) &&
              state.tableSorting[0]?.id === fieldId
                ? []
                : state.tableSorting,
            visibleLogFieldIds: nextFieldIds,
          };
        }),
      toggleGroupedLogField: (fieldId) =>
        set((state) => {
          const nextFieldIds = getNextVisibleGroupedLogFieldIds(
            state.visibleGroupedLogFieldIds,
            fieldId,
          );

          if (
            areGroupedLogFieldIdsEqual(
              state.visibleGroupedLogFieldIds,
              nextFieldIds,
            )
          ) {
            return state;
          }

          return {
            groupedTableSorting:
              !nextFieldIds.includes(fieldId) &&
              state.groupedTableSorting[0]?.id === fieldId
                ? []
                : state.groupedTableSorting,
            visibleGroupedLogFieldIds: nextFieldIds,
          };
        }),
    }),
    {
      name: SETTINGS_STORAGE_NAME,
      version: SETTINGS_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(isPersistedSettings(persistedState)
          ? {
              groupedTableSorting: getPersistedGroupedTableSorting(
                persistedState,
                currentState.groupedTableSorting,
              ),
              logsViewMode: getPersistedLogsViewMode(
                persistedState.logsViewMode,
                currentState.logsViewMode,
              ),
              tableSorting: getPersistedTableSorting(
                persistedState,
                currentState.tableSorting,
              ),
              visibleGroupedLogFieldIds: normalizeVisibleGroupedLogFieldIds(
                persistedState.visibleGroupedLogFieldIds,
              ),
              visibleLogFieldIds: normalizeVisibleLogFieldIds(
                persistedState.visibleLogFieldIds,
              ),
            }
          : null),
      }),
      partialize: partializeSettings,
    },
  ),
);

function sortLogFieldIds(fieldIds: readonly LogFieldId[]): LogFieldId[] {
  const selectedIds = new Set(fieldIds);

  return LOG_FIELD_DEFINITIONS.map((field) => field.id).filter((fieldId) =>
    selectedIds.has(fieldId),
  );
}

function sortGroupedLogFieldIds(
  fieldIds: readonly GroupedLogFieldId[],
): GroupedLogFieldId[] {
  const selectedIds = new Set(fieldIds);

  return GROUPED_LOG_FIELD_DEFINITIONS.map((field) => field.id).filter(
    (fieldId) => selectedIds.has(fieldId),
  );
}

function normalizeTableSorting(
  sorting: readonly TableSortInput[] | undefined,
): LogColumnSort[] {
  const [sort] = sorting ?? [];

  if (!sort || !isLogFieldId(sort.id)) {
    return [];
  }

  return [
    {
      id: sort.id,
      desc: Boolean(sort.desc),
    },
  ];
}

function normalizeGroupedTableSorting(
  sorting: readonly TableSortInput[] | undefined,
): GroupedLogColumnSort[] {
  const [sort] = sorting ?? [];

  if (!sort || !isGroupedLogFieldId(sort.id)) {
    return [];
  }

  return [
    {
      id: sort.id,
      desc: Boolean(sort.desc),
    },
  ];
}

function areLogFieldIdsEqual(
  left: readonly LogFieldId[],
  right: readonly LogFieldId[],
): boolean {
  return left.length === right.length && left.every((fieldId, index) => fieldId === right[index]);
}

function areGroupedLogFieldIdsEqual(
  left: readonly GroupedLogFieldId[],
  right: readonly GroupedLogFieldId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((fieldId, index) => fieldId === right[index])
  );
}

function areTableSortsEqual(
  left: readonly LogColumnSort[],
  right: readonly LogColumnSort[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (sort, index) =>
        sort.id === right[index]?.id && sort.desc === right[index]?.desc,
    )
  );
}

function areGroupedTableSortsEqual(
  left: readonly GroupedLogColumnSort[],
  right: readonly GroupedLogColumnSort[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (sort, index) =>
        sort.id === right[index]?.id && sort.desc === right[index]?.desc,
    )
  );
}

function isPersistedSettings(value: unknown): value is PersistedSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    "visibleLogFieldIds" in value &&
    Array.isArray(value.visibleLogFieldIds)
  );
}

function getPersistedLogsViewMode(
  persistedMode: unknown,
  fallbackMode: LogsViewMode,
): LogsViewMode {
  return persistedMode === "logs" || persistedMode === "grouped"
    ? persistedMode
    : fallbackMode;
}

function getPersistedTableSorting(
  persistedState: PersistedSettings,
  fallbackSorting: readonly LogColumnSort[],
): LogColumnSort[] {
  if (!Array.isArray(persistedState.tableSorting)) {
    return [...fallbackSorting];
  }

  return normalizeTableSorting(persistedState.tableSorting);
}

function getPersistedGroupedTableSorting(
  persistedState: PersistedSettings,
  fallbackSorting: readonly GroupedLogColumnSort[],
): GroupedLogColumnSort[] {
  if (!Array.isArray(persistedState.groupedTableSorting)) {
    return [...fallbackSorting];
  }

  return normalizeGroupedTableSorting(persistedState.groupedTableSorting);
}
