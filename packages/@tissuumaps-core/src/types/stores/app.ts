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

  /**
   * The registered plugins, by plugin ID, each as its human-readable name
   * together with the element its user interface is mounted into, if it has one
   *
   * Written by the plugin registry, which owns the plugin lifecycle and keeps
   * the plugin objects themselves to itself, so that nothing a plugin owns ends
   * up frozen in the store.
   */
  plugins: Map<string, { name: string; container?: HTMLElement }>;
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
