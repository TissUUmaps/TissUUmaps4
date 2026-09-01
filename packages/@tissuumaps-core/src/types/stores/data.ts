import type { Mutate, StoreApi } from "zustand";

import type { Data } from "../../storage/base";
import type { ImageData } from "../../storage/image";
import type { LabelsData } from "../../storage/labels";
import type { PointsData } from "../../storage/points";
import type { ShapesData } from "../../storage/shapes";
import type { TableData } from "../../storage/table";

/**
 * A reference to an object's data, in one of three states
 *
 * While `status` is `"loading"`, `progress` and `total` carry the most recent
 * progress report, if there was any; `"loaded"` carries the data, and
 * `"error"` the reason why loading it failed. A reference is replaced, rather
 * than mutated, whenever its state changes.
 */
export type DataRef<TData extends Data> = {
  /** Resolves with the loaded data, or rejects with the loading error */
  promise: Promise<TData>;
} & (
  | { status: "loading"; progress?: number; total?: number }
  | { status: "loaded"; data: TData }
  | { status: "error"; error: unknown }
);

/**
 * The state of the data store, holding the data of the current project
 *
 * Each map is keyed by object ID; objects whose data is neither loaded nor
 * being loaded are absent.
 */
export type DataStoreState = {
  /** The data references of the project's images */
  imageDataRefs: Map<string, DataRef<ImageData>>;

  /** The data references of the project's labels */
  labelsDataRefs: Map<string, DataRef<LabelsData>>;

  /** The data references of the project's points */
  pointsDataRefs: Map<string, DataRef<PointsData>>;

  /** The data references of the project's shapes */
  shapesDataRefs: Map<string, DataRef<ShapesData>>;

  /** The data references of the project's tables */
  tableDataRefs: Map<string, DataRef<TableData>>;
};

/**
 * The actions of the data store
 *
 * The data store has none: it is written to by the application, which keeps it
 * in sync with the project and with the data it has loaded.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DataStoreActions = {};

/**
 * The data store, i.e. its state and actions
 */
export type DataStore = DataStoreState & DataStoreActions;

/**
 * The API through which the data store is read and subscribed to
 */
export type DataStoreApi = Mutate<
  StoreApi<DataStore>,
  [["zustand/immer", never]]
>;
