import { createStore, useStore } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  SettingsStore,
  SettingsStoreApi,
  SettingsStoreState,
} from "@tissuumaps/core";

import "./zustand";

/**
 * The store holding the user's application settings
 *
 * The settings are persisted to local storage under `settings-storage` and
 * rehydrated when this module is evaluated.
 */
export const settingsStore: SettingsStoreApi = createStore<SettingsStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...createInitialSettingsStoreState(),
        setDark: (dark) => set({ dark }),
      })),
      { name: "settings-storage" },
    ),
    { name: "settings", enabled: import.meta.env.DEV },
  ),
);

/**
 * Subscribes a component to a part of the {@link settingsStore}
 *
 * @param selector - Selects the part of the store state to subscribe to
 * @returns The selected value, re-rendering the component whenever it changes
 */
export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  return useStore(settingsStore, selector);
}

/**
 * Creates the default settings, used until persisted settings are rehydrated
 */
function createInitialSettingsStoreState(): SettingsStoreState {
  return {
    dark: false,
  };
}
