import type { AppStoreApi } from "./stores/app";
import type { DataStoreApi } from "./stores/data";
import type { ProjectStoreApi } from "./stores/project";
import type { SettingsStoreApi } from "./stores/settings";

/**
 * The stores provided by the application for a plugin to interact with
 */
export type PluginStores = {
  appStore: AppStoreApi;
  dataStore: DataStoreApi;
  projectStore: ProjectStoreApi;
  settingsStore: SettingsStoreApi;
};

/**
 * A plugin that can be registered with the application
 */
export type Plugin = {
  /** The unique ID of the plugin */
  id: string;

  /** The human-readable name of the plugin */
  name: string;

  /**
   * Mounts the plugin's panel, through which it shows a user interface, if any
   *
   * The panel is shown as a tab titled with the plugin's {@link name}, for
   * exactly as long as the plugin is registered: it is mounted once
   * {@link setup} has returned successfully, if there is one, and unmounted when
   * the plugin is unregistered. Closing the panel unregisters the plugin; a
   * plugin without a panel can only be unregistered through the registry.
   *
   * Called with an empty element owned by the panel. The application empties the
   * container again after the returned callback has run, so the callback only
   * has to release what is not plain DOM, such as store subscriptions, listeners
   * on `window`, or a React root.
   *
   * @param container - The element to mount the user interface into
   * @param stores - The stores provided by the application for the plugin to interact with
   * @returns A callback that unmounts the user interface again, if any
   */
  panel?: (container: HTMLElement, stores: PluginStores) => (() => void) | void;

  /**
   * Sets up the plugin and registers any necessary event listeners or other resources
   *
   * A plugin whose `setup` throws is not registered, and its {@link teardown} is
   * not called: releasing whatever `setup` had already acquired before it throws
   * is `setup`'s own responsibility.
   *
   * A plugin that only contributes a {@link panel} does not need a `setup`: its
   * `panel` receives the same stores.
   *
   * @param stores - The stores provided by the application for the plugin to interact with
   */
  setup?: (stores: PluginStores) => void;

  /**
   * Tears down the plugin and unregisters any event listeners or other resources
   *
   * Only called for a plugin that was registered successfully, i.e. one whose
   * {@link setup} did not throw. It is called before the plugin's {@link panel}
   * is unmounted, so cleaning up the user interface belongs in the callback
   * returned by {@link panel} rather than here.
   */
  teardown?: () => void;
};

/**
 * The registry through which the application registers and unregisters plugins
 */
export type PluginRegistry = {
  /**
   * Registers a plugin and calls its `setup` function, if it has one
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
