import { LabelsData } from "../data/labels";
import { CompleteLabels, CompleteLabelsDataSource } from "../model/labels";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labelsMap: Map<string, CompleteLabels>;
  labelsDataCache: Map<CompleteLabelsDataSource, LabelsData>;
};

export type LabelsSliceActions = {
  addLabels: (labels: CompleteLabels, index?: number) => void;
  loadLabels: (
    labels: CompleteLabels,
    signal?: AbortSignal,
  ) => Promise<LabelsData>;
  loadLabelsByID: (
    labelsId: string,
    signal?: AbortSignal,
  ) => Promise<LabelsData>;
  unloadLabels: (labels: CompleteLabels) => void;
  unloadLabelsByID: (labelsId: string) => void;
  deleteLabels: (labels: CompleteLabels) => void;
  deleteLabelsByID: (labelsId: string) => void;
  clearLabels: () => void;
};

export const createLabelsSlice: BoundStoreStateCreator<LabelsSlice> = (
  set,
  get,
) => ({
  ...initialLabelsSliceState,
  addLabels: (labels, index) => {
    const state = get();
    const oldLabels = state.labelsMap.get(labels.id);
    if (oldLabels !== undefined) {
      state.unloadLabels(oldLabels);
    }
    set((draft) => {
      draft.labelsMap = MapUtils.cloneAndSpliceSet(
        draft.labelsMap,
        labels.id,
        labels,
        index,
      );
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
  unloadLabels: (labels) => {
    const state = get();
    const labelsData = state.labelsDataCache.get(labels.dataSource);
    set((draft) => {
      draft.labelsDataCache.delete(labels.dataSource);
    });
    labelsData?.destroy();
  },
  unloadLabelsByID: (labelsId) => {
    const state = get();
    const labels = state.labelsMap.get(labelsId);
    if (labels === undefined) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    state.unloadLabels(labels);
  },
  deleteLabels: (labels) => {
    const state = get();
    state.unloadLabels(labels);
    set((draft) => {
      draft.labelsMap.delete(labels.id);
    });
  },
  deleteLabelsByID: (labelsId) => {
    const state = get();
    const labels = state.labelsMap.get(labelsId);
    if (labels === undefined) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    state.deleteLabels(labels);
  },
  clearLabels: () => {
    const state = get();
    state.labelsMap.forEach((labels) => {
      state.deleteLabels(labels);
    });
    set(initialLabelsSliceState);
  },
});

const initialLabelsSliceState: LabelsSliceState = {
  labelsMap: new Map(),
  labelsDataCache: new Map(),
};
