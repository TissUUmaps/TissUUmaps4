import { ILabelsData, ILabelsDataLoader } from "../data/labels";
import {
  ITIFFLabelsDataSourceModel,
  TIFFLabelsDataLoader,
  TIFF_LABELS_DATA_SOURCE,
} from "../data/loaders/tiff";
import {
  IZarrLabelsDataSourceModel,
  ZARR_LABELS_DATA_SOURCE,
  ZarrLabelsDataLoader,
} from "../data/loaders/zarr";
import { ITableData } from "../data/table";
import { ILabelsDataSourceModel, ILabelsModel } from "../models/labels";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

type LabelsDataLoaderFactory = (
  dataSource: ILabelsDataSourceModel,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<ITableData>,
) => ILabelsDataLoader<ILabelsData>;

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labelsMap: Map<string, ILabelsModel>;
  labelsDataCache: Map<ILabelsDataSourceModel, ILabelsData>;
  labelsDataLoaderFactories: Map<string, LabelsDataLoaderFactory>;
};

export type LabelsSliceActions = {
  setLabels: (labels: ILabelsModel, index?: number) => void;
  loadLabels: (
    labels: ILabelsModel,
    signal?: AbortSignal,
  ) => Promise<ILabelsData>;
  loadLabelsByID: (
    labelsId: string,
    signal?: AbortSignal,
  ) => Promise<ILabelsData>;
  deleteLabels: (labels: ILabelsModel) => void;
};

export const createLabelsSlice: BoundStoreStateCreator<LabelsSlice> = (
  set,
  get,
) => ({
  ...initialLabelsSliceState,
  setLabels: (labels, index) => {
    set((draft) => {
      const oldLabels = draft.labelsMap.get(labels.id);
      draft.labelsMap = MapUtils.cloneAndSpliceSet(
        draft.labelsMap,
        labels.id,
        labels,
        index,
      );
      if (oldLabels !== undefined) {
        draft.labelsDataCache.delete(oldLabels.dataSource);
      }
    });
  },
  loadLabels: async (labels, signal) => {
    signal?.throwIfAborted();
    const state = get();
    let labelsData = state.labelsDataCache.get(labels.dataSource);
    if (labelsData !== undefined) {
      return labelsData;
    }
    const labelsDataLoaderFactory = state.labelsDataLoaderFactories.get(
      labels.dataSource.type,
    );
    if (labelsDataLoaderFactory === undefined) {
      throw new Error(
        `No labels data loader found for type ${labels.dataSource.type}.`,
      );
    }
    const labelsDataLoader = labelsDataLoaderFactory(
      labels.dataSource,
      state.projectDir,
      state.loadTableByID,
    );
    labelsData = await labelsDataLoader.loadLabels(signal);
    signal?.throwIfAborted();
    set((draft) => {
      draft.labelsDataCache.set(labels.dataSource, labelsData);
    });
    return labelsData;
  },
  loadLabelsByID: async (labelsId, signal) => {
    signal?.throwIfAborted();
    const state = get();
    const labels = state.labelsMap.get(labelsId);
    if (labels === undefined) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    return state.loadLabels(labels, signal);
  },
  deleteLabels: (labels) => {
    set((draft) => {
      draft.labelsMap.delete(labels.id);
      draft.labelsDataCache.delete(labels.dataSource);
    });
  },
});

const initialLabelsSliceState: LabelsSliceState = {
  labelsMap: new Map<string, ILabelsModel>(),
  labelsDataCache: new Map<ILabelsDataSourceModel, ILabelsData>(),
  labelsDataLoaderFactories: new Map<string, LabelsDataLoaderFactory>([
    [
      TIFF_LABELS_DATA_SOURCE,
      (dataSource, projectDir) =>
        new TIFFLabelsDataLoader(
          dataSource as ITIFFLabelsDataSourceModel,
          projectDir,
        ),
    ],
    [
      ZARR_LABELS_DATA_SOURCE,
      (dataSource, projectDir) =>
        new ZarrLabelsDataLoader(
          dataSource as IZarrLabelsDataSourceModel,
          projectDir,
        ),
    ],
  ]),
};
