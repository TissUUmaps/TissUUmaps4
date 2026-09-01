import type { Mutate, StoreApi } from "zustand";

/**
 * The state of the settings store, holding the user's application settings
 */
export type SettingsStoreState = {
  /** Whether the user interface is shown in dark mode */
  dark: boolean;
};

/**
 * The actions of the settings store
 */
export type SettingsStoreActions = {
  /**
   * Switches the user interface between light and dark mode
   *
   * @param dark - Whether to show the user interface in dark mode
   */
  setDark: (dark: boolean) => void;
};

/**
 * The settings store, i.e. its state and actions
 */
export type SettingsStore = SettingsStoreState & SettingsStoreActions;

/**
 * The API through which the settings store is read, written and subscribed to
 */
export type SettingsStoreApi = Mutate<
  StoreApi<SettingsStore>,
  [["zustand/immer", never]]
>;
