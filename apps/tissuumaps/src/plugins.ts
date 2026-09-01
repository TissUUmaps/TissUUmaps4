import type { PluginRegistry } from "@tissuumaps/core";

import { appStore } from "./stores/app";

declare global {
  interface Window {
    /** The plugin registry, available once the application has started up */
    tissuumaps?: PluginRegistry;
  }
}

/**
 * Exposes the plugin registry to plugins as `window.tissuumaps`
 *
 * The registry forwards to the app store, which sets a plugin up when it is
 * registered and tears it down when it is unregistered.
 *
 * @returns A callback that removes the registry from `window` again, unless it
 * has been replaced in the meantime, and unregisters all plugins that are still
 * registered
 */
export function startPluginRegistry(): () => void {
  const pluginRegistry: PluginRegistry = {
    registerPlugin: (plugin) => appStore.getState().registerPlugin(plugin),
    unregisterPlugin: (pluginId) =>
      appStore.getState().unregisterPlugin(pluginId),
  };
  window.tissuumaps = pluginRegistry;
  return () => {
    if (window.tissuumaps === pluginRegistry) {
      delete window.tissuumaps;
    }
    for (const pluginId of [...appStore.getState().plugins.keys()]) {
      pluginRegistry.unregisterPlugin(pluginId);
    }
  };
}
