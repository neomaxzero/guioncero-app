"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_VISIBLE_LOG_FIELD_IDS,
  LOG_FIELD_DEFINITIONS,
  isLogFieldId,
  type LogFieldId,
  normalizeVisibleLogFieldIds,
} from "@/models";

export const SETTINGS_STORAGE_NAME = "guioncero-settings";
export const SETTINGS_STORAGE_VERSION = 1;

export type PersistedSettings = {
  tableSorting: LogColumnSort[];
  visibleLogFieldIds: LogFieldId[];
};

export type LogColumnSort = {
  id: LogFieldId;
  desc: boolean;
};

export const DEFAULT_TABLE_SORTING: LogColumnSort[] = [
  {
    id: "time",
    desc: true,
  },
];

export type SettingsState = PersistedSettings & {
  setTableSorting: (sorting: readonly TableSortInput[]) => void;
  setVisibleLogFieldIds: (fieldIds: readonly string[]) => void;
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

export function partializeSettings(state: SettingsState): PersistedSettings {
  return {
    tableSorting: state.tableSorting,
    visibleLogFieldIds: state.visibleLogFieldIds,
  };
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      tableSorting: [...DEFAULT_TABLE_SORTING],
      visibleLogFieldIds: [...DEFAULT_VISIBLE_LOG_FIELD_IDS],
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
    }),
    {
      name: SETTINGS_STORAGE_NAME,
      version: SETTINGS_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(isPersistedSettings(persistedState)
          ? {
              tableSorting: getPersistedTableSorting(
                persistedState,
                currentState.tableSorting,
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

function areLogFieldIdsEqual(
  left: readonly LogFieldId[],
  right: readonly LogFieldId[],
): boolean {
  return left.length === right.length && left.every((fieldId, index) => fieldId === right[index]);
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

function isPersistedSettings(value: unknown): value is PersistedSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    "visibleLogFieldIds" in value &&
    Array.isArray(value.visibleLogFieldIds)
  );
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
