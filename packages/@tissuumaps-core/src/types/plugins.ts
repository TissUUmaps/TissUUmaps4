import type { AppStoreApi } from "./stores/app";
import type { DataStoreApi } from "./stores/data";
import type { ProjectStoreApi } from "./stores/project";
import type { SettingsStoreApi } from "./stores/settings";

/**
 * A plugin that can be registered with the application
 */
export type Plugin = {
  /** The unique ID of the plugin */
  id: string;

  /** The human-readable name of the plugin */
  name: string;

  /**
   * Sets up the plugin and registers any necessary event listeners or other resources
   *
   * A plugin whose `setup` throws is not registered, and its {@link teardown} is
   * not called: releasing whatever `setup` had already acquired before it throws
   * is `setup`'s own responsibility.
   *
   * @param stores - The stores provided by the application for the plugin to interact with
   */
  setup: (stores: {
    appStore: AppStoreApi;
    dataStore: DataStoreApi;
    projectStore: ProjectStoreApi;
    settingsStore: SettingsStoreApi;
  }) => void;

  /**
   * Tears down the plugin and unregisters any event listeners or other resources
   *
   * Only called for a plugin whose {@link setup} returned successfully.
   */
  teardown?: () => void;
};

/**
 * The registry through which the application registers and unregisters plugins
 */
export type PluginRegistry = {
  /**
   * Registers a plugin and calls its `setup` function
   *
   * Registering a plugin whose ID is already in use unregisters the previously
   * registered plugin first.
   *
   * @param plugin - The plugin to register
   */
  registerPlugin: (plugin: Plugin) => void;

  /**
   * Calls a registered plugin's `teardown` function and unregisters it
   *
   * @param pluginId - The ID of the plugin to unregister
   */
  unregisterPlugin: (pluginId: string) => void;
};
