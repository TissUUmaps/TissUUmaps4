import { createStore, useStore } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { DataStore, DataStoreApi, DataStoreState } from "@tissuumaps/core";

import "./zustand";

/**
 * The store holding the data of the current project's objects
 *
 * The store maps object IDs to data references. It has no actions: it is
 * written to exclusively by the data caches (see `@/data/cache`), which keep it
 * in sync with the project store, and is read-only for the rest of the
 * application.
 */
export const dataStore: DataStoreApi = createStore<DataStore>()(
  devtools(
    immer(() => ({
      ...createInitialDataStoreState(),
    })),
    { name: "data", enabled: import.meta.env.DEV },
  ),
);

/**
 * Subscribes a component to a part of the {@link dataStore}
 *
 * @param selector - Selects the part of the store state to subscribe to
 * @returns The selected value, re-rendering the component whenever it changes
 */
export function useDataStore<T>(selector: (state: DataStore) => T): T {
  return useStore(dataStore, selector);
}

/**
 * Creates the initial {@link dataStore} state, with no data referenced
 */
function createInitialDataStoreState(): DataStoreState {
  return {
    imageDataRefs: new Map(),
    labelsDataRefs: new Map(),
    pointsDataRefs: new Map(),
    shapesDataRefs: new Map(),
    tableDataRefs: new Map(),
  };
}
