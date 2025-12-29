import { deepEqual } from "fast-equals";

import {
  type Labels,
  type LabelsData,
  type LabelsDataSource,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labels: Labels[];
  _labelsDataCache: { dataSource: LabelsDataSource; data: LabelsData }[];
};

export type LabelsSliceActions = {
  addLabels: (labels: Labels, index?: number) => void;
  moveLabels: (labelsId: string, newIndex: number) => void;
  loadLabels: (
    labelsId: string,
    options: { signal?: AbortSignal },
  ) => Promise<LabelsData>;
  unloadLabels: (labelsId: string) => void;
  deleteLabels: (labelsId: string) => void;
  clearLabels: () => void;
};

export const createLabelsSlice: TissUUmapsStateCreator<LabelsSlice> = (
  set,
  get,
) => ({
  ...initialLabelsSliceState,
  addLabels: (labels, index) => {
    const state = get();
    if (state.labels.find((x) => x.id === labels.id) !== undefined) {
      throw new Error(`Labels with ID ${labels.id} already exists.`);
    }
    set((draft) => {
      draft.labels.splice(index ?? draft.labels.length, 0, labels);
    });
  },
  moveLabels: (labelsId, newIndex) => {
    const state = get();
    const oldIndex = state.labels.findIndex((labels) => labels.id === labelsId);
    if (oldIndex === -1) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const [labels] = draft.labels.splice(oldIndex, 1);
        draft.labels.splice(newIndex, 0, labels!);
      });
    }
  },
  loadLabels: async (labelsId, { signal }: { signal?: AbortSignal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    const labels = state.labels.find((labels) => labels.id === labelsId);
    if (labels === undefined) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    const cache = state._labelsDataCache.find(({ dataSource }) =>
      deepEqual(dataSource, labels.dataSource),
    );
    if (cache !== undefined) {
      return cache.data;
    }
    const dataLoaderFactory = state.labelsDataLoaderFactories.get(
      labels.dataSource.type,
    );
    if (dataLoaderFactory === undefined) {
      throw new Error(
        `No labels data loader found for type ${labels.dataSource.type}.`,
      );
    }
    const dataLoader = dataLoaderFactory(
      labels.dataSource,
      state.projectDir,
      state.loadTable,
    );
    const data = await dataLoader.loadLabels({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft._labelsDataCache.push({ dataSource: labels.dataSource, data });
    });
    return data;
  },
  unloadLabels: (labelsId) => {
    const state = get();
    const labels = state.labels.find((labels) => labels.id === labelsId);
    if (labels === undefined) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    const cacheIndex = state._labelsDataCache.findIndex(({ dataSource }) =>
      deepEqual(dataSource, labels.dataSource),
    );
    if (cacheIndex !== -1) {
      const cache = state._labelsDataCache[cacheIndex]!;
      set((draft) => {
        draft._labelsDataCache.splice(cacheIndex, 1);
      });
      cache.data.destroy();
    }
  },
  deleteLabels: (labelsId) => {
    const state = get();
    const index = state.labels.findIndex((labels) => labels.id === labelsId);
    if (index === -1) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    state.unloadLabels(labelsId);
    set((draft) => {
      draft.labels.splice(index, 1);
    });
  },
  clearLabels: () => {
    const state = get();
    while (state.labels.length > 0) {
      state.deleteLabels(state.labels[0]!.id);
    }
    set(initialLabelsSliceState);
  },
});

const initialLabelsSliceState: LabelsSliceState = {
  labels: [],
  _labelsDataCache: [],
};
