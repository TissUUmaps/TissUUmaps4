import { castDraft } from "immer";

import type { PluginRegistry, PluginStores } from "@tissuumaps/core";

import { appStore } from "./stores/app";
import { dataStore } from "./stores/data";
import { projectStore } from "./stores/project";
import { settingsStore } from "./stores/settings";

declare global {
  interface Window {
    /** The plugin registry, available once the application has started up */
    tissuumaps?: PluginRegistry;
  }
}

/**
 * The stores handed to a plugin, both when it is set up and when it is mounted
 */
const pluginStores: PluginStores = {
  appStore,
  dataStore,
  projectStore,
  settingsStore,
};

/**
 * The callbacks that unmount the user interface and tear the plugin down again,
 * for each registered plugin, by plugin ID
 *
 * Kept outside of the app store, whose state holds the plugins' names and
 * containers, since the callbacks are the registry's business alone.
 */
const pluginRegistrations = new Map<
  string,
  { unmount: (() => void) | void; teardown: (() => void) | void }
>();

/**
 * The plugin registry, which owns the plugin lifecycle
 *
 * Registering a plugin calls its `setup` and then its `mount`, and adds the
 * plugin to the app store once both have succeeded, as its name together with
 * the element its user interface is mounted into; unregistering it removes the
 * plugin from the app store first, and then calls the unmount callback returned
 * by `mount` and the teardown callback returned by `setup`. The registry is the
 * only writer of the app store's `plugins`.
 *
 * The plugin object itself is not kept: the app store only holds what the user
 * interface renders, so that Immer does not freeze anything the plugin owns.
 *
 * Errors thrown by a plugin are caught and logged, so that a failing plugin
 * does not take the application down with it. A plugin whose `setup` throws is
 * not registered, and neither is one whose `mount` throws, but the latter's
 * teardown callback is called, since its `setup` did succeed.
 */
export const pluginRegistry: PluginRegistry = {
  registerPlugin: (plugin) => {
    pluginRegistry.unregisterPlugin(plugin.id);
    let teardown: (() => void) | void = undefined;
    if (plugin.setup !== undefined) {
      try {
        teardown = plugin.setup(pluginStores);
      } catch (setupError) {
        console.error(`Error during setup of plugin ${plugin.id}:`, setupError);
        return;
      }
    }
    let container: HTMLElement | undefined = undefined;
    let unmount: (() => void) | void = undefined;
    if (plugin.mount !== undefined) {
      container = document.createElement("div");
      try {
        unmount = plugin.mount(container, pluginStores);
      } catch (mountError) {
        console.error(`Error during mount of plugin ${plugin.id}:`, mountError);
        try {
          teardown?.();
        } catch (teardownError) {
          console.error(
            `Error during teardown of plugin ${plugin.id}:`,
            teardownError,
          );
        }
        return;
      }
    }
    pluginRegistrations.set(plugin.id, { unmount, teardown });
    appStore.setState((draft) => {
      // the element is opaque to Immer, which its draft type cannot express
      draft.plugins.set(plugin.id, castDraft({ name: plugin.name, container }));
    });
  },
  unregisterPlugin: (pluginId) => {
    const registration = pluginRegistrations.get(pluginId);
    if (registration !== undefined) {
      pluginRegistrations.delete(pluginId);
      appStore.setState((draft) => {
        draft.plugins.delete(pluginId);
      });
      try {
        registration.unmount?.();
      } catch (unmountError) {
        console.error(
          `Error during unmount of plugin ${pluginId}:`,
          unmountError,
        );
      }
      try {
        registration.teardown?.();
      } catch (teardownError) {
        console.error(
          `Error during teardown of plugin ${pluginId}:`,
          teardownError,
        );
      }
    }
  },
};

/**
 * Exposes the {@link pluginRegistry} to plugins as `window.tissuumaps`
 *
 * @returns A callback that removes the registry from `window` again, unless it
 * has been replaced in the meantime, and unregisters all plugins that are still
 * registered
 */
export function startPluginRegistry(): () => void {
  window.tissuumaps = pluginRegistry;
  return () => {
    if (window.tissuumaps === pluginRegistry) {
      delete window.tissuumaps;
    }
    for (const pluginId of [...pluginRegistrations.keys()]) {
      pluginRegistry.unregisterPlugin(pluginId);
    }
  };
}
