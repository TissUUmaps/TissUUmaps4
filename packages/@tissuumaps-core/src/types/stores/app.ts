import type { Mutate, StoreApi } from "zustand";

import type { ImageDataSource } from "../../model/image";
import type { LabelsDataSource } from "../../model/labels";
import type { PointsDataSource } from "../../model/points";
import type { ShapesDataSource } from "../../model/shapes";
import type { TableDataSource } from "../../model/table";
import type { ImageData, ImageDataProvider } from "../../storage/image";
import type { LabelsData, LabelsDataProvider } from "../../storage/labels";
import type { PointsData, PointsDataProvider } from "../../storage/points";
import type { ShapesData, ShapesDataProvider } from "../../storage/shapes";
import type { TableData, TableDataProvider } from "../../storage/table";
import type { InteractionMode } from "../interaction";
import type { Plugin } from "../plugins";

/**
 * The state of the app store, holding what is not part of the project
 */
export type AppStoreState = {
  /** The directory handle of the open workspace, if any */
  workspace: FileSystemDirectoryHandle | null;

  /** How mouse events in the viewer are currently interpreted */
  interactionMode: InteractionMode;

  /** The registered image data providers, by data source type */
  imageDataProviders: Map<
    string,
    ImageDataProvider<ImageDataSource, ImageData>
  >;

  /** The registered labels data providers, by data source type */
  labelsDataProviders: Map<
    string,
    LabelsDataProvider<LabelsDataSource, LabelsData>
  >;

  /** The registered points data providers, by data source type */
  pointsDataProviders: Map<
    string,
    PointsDataProvider<PointsDataSource, PointsData>
  >;

  /** The registered shapes data providers, by data source type */
  shapesDataProviders: Map<
    string,
    ShapesDataProvider<ShapesDataSource, ShapesData>
  >;

  /** The registered table data providers, by data source type */
  tableDataProviders: Map<
    string,
    TableDataProvider<TableDataSource, TableData>
  >;

  /** The registered plugins, by plugin ID */
  plugins: Map<string, Plugin>;
};

/**
 * The actions of the app store
 *
 * Registering a data provider for a data source type that is already taken
 * replaces the previously registered provider, which invalidates the data
 * loaded through it.
 */
export type AppStoreActions = {
  /**
   * Opens a workspace, against which local data source paths are resolved
   *
   * @param workspace - The directory handle of the workspace, or `null` to
   * close the open workspace
   */
  setWorkspace: (workspace: FileSystemDirectoryHandle | null) => void;

  /**
   * Sets how mouse events in the viewer are interpreted
   *
   * @param interactionMode - The interaction mode to switch to
   */
  setInteractionMode: (interactionMode: InteractionMode) => void;

  /**
   * Registers an image data provider
   *
   * @param type - The data source type the provider handles
   * @param dataProvider - The data provider to register
   */
  registerImageDataProvider: (
    type: string,
    dataProvider: ImageDataProvider<ImageDataSource, ImageData>,
  ) => void;

  /**
   * Registers a labels data provider
   *
   * @param type - The data source type the provider handles
   * @param dataProvider - The data provider to register
   */
  registerLabelsDataProvider: (
    type: string,
    dataProvider: LabelsDataProvider<LabelsDataSource, LabelsData>,
  ) => void;

  /**
   * Registers a points data provider
   *
   * @param type - The data source type the provider handles
   * @param dataProvider - The data provider to register
   */
  registerPointsDataProvider: (
    type: string,
    dataProvider: PointsDataProvider<PointsDataSource, PointsData>,
  ) => void;

  /**
   * Registers a shapes data provider
   *
   * @param type - The data source type the provider handles
   * @param dataProvider - The data provider to register
   */
  registerShapesDataProvider: (
    type: string,
    dataProvider: ShapesDataProvider<ShapesDataSource, ShapesData>,
  ) => void;

  /**
   * Registers a table data provider
   *
   * @param type - The data source type the provider handles
   * @param dataProvider - The data provider to register
   */
  registerTableDataProvider: (
    type: string,
    dataProvider: TableDataProvider<TableDataSource, TableData>,
  ) => void;

  /**
   * Registers a plugin and calls its `setup` function, see
   * {@link PluginRegistry.registerPlugin}
   *
   * @param plugin - The plugin to register
   */
  registerPlugin: (plugin: Plugin) => void;

  /**
   * Calls a registered plugin's `teardown` function and unregisters it, see
   * {@link PluginRegistry.unregisterPlugin}
   *
   * @param pluginId - The ID of the plugin to unregister
   */
  unregisterPlugin: (pluginId: string) => void;
};

/**
 * The app store, i.e. its state and actions
 */
export type AppStore = AppStoreState & AppStoreActions;

/**
 * The API through which the app store is read, written and subscribed to
 */
export type AppStoreApi = Mutate<
  StoreApi<AppStore>,
  [["zustand/immer", never]]
>;
