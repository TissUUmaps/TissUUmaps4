import { createStore, useStore } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { AppStore, AppStoreApi, AppStoreState } from "@tissuumaps/core";

import { dataStore } from "./data";
import { projectStore } from "./project";
import { settingsStore } from "./settings";
import "./zustand";

/**
 * The store holding application state that is not part of the project
 *
 * This comprises the open workspace, the current interaction mode, the
 * registered data providers, and the registered plugins.
 */
export const appStore: AppStoreApi = createStore<AppStore>()(
  devtools(
    immer((set, get) => ({
      ...createInitialAppStoreState(),
      setWorkspace: (workspace) => set({ workspace }),
      setInteractionMode: (interactionMode) => set({ interactionMode }),
      registerImageDataProvider: (type, dataProvider) =>
        set((draft) => {
          draft.imageDataProviders.set(type, dataProvider);
        }),
      registerLabelsDataProvider: (type, dataProvider) =>
        set((draft) => {
          draft.labelsDataProviders.set(type, dataProvider);
        }),
      registerPointsDataProvider: (type, dataProvider) =>
        set((draft) => {
          draft.pointsDataProviders.set(type, dataProvider);
        }),
      registerShapesDataProvider: (type, dataProvider) =>
        set((draft) => {
          draft.shapesDataProviders.set(type, dataProvider);
        }),
      registerTableDataProvider: (type, dataProvider) =>
        set((draft) => {
          draft.tableDataProviders.set(type, dataProvider);
        }),
      registerPlugin: (plugin) => {
        get().unregisterPlugin(plugin.id);
        try {
          plugin.setup({ appStore, dataStore, projectStore, settingsStore });
        } catch (error) {
          console.error(`Error during setup of plugin ${plugin.id}:`, error);
          return;
        }
        set((draft) => {
          draft.plugins.set(plugin.id, plugin);
        });
      },
      unregisterPlugin: (pluginId) => {
        const plugin = get().plugins.get(pluginId);
        if (plugin !== undefined) {
          set((draft) => {
            draft.plugins.delete(pluginId);
          });
          if (plugin.teardown !== undefined) {
            try {
              plugin.teardown();
            } catch (error) {
              console.error(
                `Error during teardown of plugin ${plugin.id}:`,
                error,
              );
            }
          }
        }
      },
    })),
    { name: "app", enabled: import.meta.env.DEV },
  ),
);

/**
 * Subscribes a component to a part of the {@link appStore}
 *
 * @param selector - Selects the part of the store state to subscribe to
 * @returns The selected value, re-rendering the component whenever it changes
 */
export function useAppStore<T>(selector: (state: AppStore) => T): T {
  return useStore(appStore, selector);
}

/**
 * Creates the initial {@link appStore} state, with nothing registered and no
 * workspace open
 */
function createInitialAppStoreState(): AppStoreState {
  return {
    workspace: null,
    interactionMode: "pan",
    imageDataProviders: new Map(),
    labelsDataProviders: new Map(),
    pointsDataProviders: new Map(),
    shapesDataProviders: new Map(),
    tableDataProviders: new Map(),
    plugins: new Map(),
  };
}
