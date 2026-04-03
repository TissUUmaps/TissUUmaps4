import { deepEqual } from "fast-equals";

import {
  type Labels,
  type LabelsData,
  type LabelsDataSource,
  type ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedLabelsData = {
  dataSource: LabelsDataSource;
  data: LabelsData;
};

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labels: Labels[];
  loadedLabels: Map<string, string>;
  loadedLabelsData: Map<string, LoadedLabelsData>;
};

export type LabelsSliceActions = {
  addLabels: (labels: Labels, index?: number) => void;
  updateLabels: (labelsId: string, updates: Partial<Labels>) => void;
  moveLabels: (labelsId: string, newIndex: number) => void;
  deleteLabels: (labelsId: string) => boolean;
  clearLabels: () => void;
  loadLabels: (
    labelsId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<LabelsData>;
  unloadLabels: (labelsId: string) => boolean;
};

export const createLabelsSlice: TissUUmapsStateCreator<LabelsSlice> = (
  set,
  get,
) => ({
  ...createInitialLabelsSliceState(),
  addLabels: (labels, index) => {
    const state = get();
    if (state.labels.some((x) => x.id === labels.id)) {
      throw new Error(`Labels with ID ${labels.id} already exists.`);
    }
    if (index !== undefined && (index < 0 || index > state.labels.length)) {
      throw new Error(`Index ${index} out of bounds.`);
    }
    set((draft) => {
      draft.labels.splice(index ?? draft.labels.length, 0, labels);
    });
  },
  updateLabels: (labelsId, updates) => {
    if (updates.id !== undefined || updates.dataSource !== undefined) {
      throw new Error("Updating labels ID or data source is not allowed.");
    }
    const state = get();
    const index = state.labels.findIndex((labels) => labels.id === labelsId);
    if (index === -1) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    set((draft) => {
      draft.labels[index] = { ...draft.labels[index]!, ...updates };
    });
  },
  moveLabels: (labelsId, newIndex) => {
    const state = get();
    if (newIndex < 0 || newIndex >= state.labels.length) {
      throw new Error(`Index ${newIndex} out of bounds.`);
    }
    const oldIndex = state.labels.findIndex((labels) => labels.id === labelsId);
    if (oldIndex === -1) {
      throw new Error(`Labels with ID ${labelsId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const labelsDraft = draft.labels.splice(oldIndex, 1)[0]!;
        draft.labels.splice(newIndex, 0, labelsDraft);
      });
    }
  },
  deleteLabels: (labelsId) => {
    const state = get();
    const index = state.labels.findIndex((labels) => labels.id === labelsId);
    if (index !== -1) {
      if (state.loadedLabels.has(labelsId)) {
        state.unloadLabels(labelsId);
      }
      set((draft) => {
        draft.labels.splice(index, 1);
      });
      return true;
    }
    return false;
  },
  clearLabels: () => {
    const state = get();
    for (const loadedData of state.loadedLabelsData.values()) {
      loadedData.data.close();
    }
    set(createInitialLabelsSliceState());
  },
  loadLabels: deduplicate(
    async (labelsId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the labels are already loaded
      const state = get();
      const loadedDataKey = state.loadedLabels.get(labelsId);
      if (loadedDataKey !== undefined && !reload) {
        const loadedData = state.loadedLabelsData.get(loadedDataKey);
        if (loadedData !== undefined) {
          return loadedData.data;
        }
      }
      // Find the labels and the corresponding data source (if loaded)
      const labels = state.labels.find((labels) => labels.id === labelsId);
      if (labels === undefined) {
        throw new Error(`Labels with ID ${labelsId} not found.`);
      }
      let oldLoadedData: LoadedLabelsData | undefined;
      for (const loadedData of state.loadedLabelsData.values()) {
        if (deepEqual(loadedData.dataSource, labels.dataSource)) {
          oldLoadedData = loadedData;
          break;
        }
      }
      // Load the data source if not already loaded or if a reload has been requested
      let loadedData = oldLoadedData;
      if (loadedData === undefined || reload) {
        const dataProvider = state.labelsDataProviders.get(
          labels.dataSource.type,
        );
        if (dataProvider === undefined) {
          throw new Error(
            `No labels data provider registered for data source type ${labels.dataSource.type}.`,
          );
        }
        const data = await dataProvider.open(labels.dataSource, {
          signal,
          onProgress,
          workspace: state.workspace,
        });
        signal?.throwIfAborted();
        // Check if the labels have been deleted or their data source has changed
        const currentState = get();
        const currentLabels = currentState.labels.find(
          (labels) => labels.id === labelsId,
        );
        if (
          currentLabels === undefined ||
          !deepEqual(currentLabels.dataSource, labels.dataSource)
        ) {
          data.close();
          throw new DOMException(
            `Labels with ID ${labelsId} have been deleted or their data source has changed.`,
            "AbortError",
          );
        }
        loadedData = { dataSource: currentLabels.dataSource, data };
      }
      // Store the loaded labels and the corresponding data source in the state
      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedLabelsData) {
          if (deepEqual(value.dataSource, loadedData.dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedLabelsData.has(loadedDataKey));
        }
        draft.loadedLabels.set(labelsId, loadedDataKey);
        draft.loadedLabelsData.set(loadedDataKey, loadedData);
      });
      // Clean up old data if the loaded data source has changed
      if (
        oldLoadedData !== undefined &&
        oldLoadedData.data !== loadedData.data
      ) {
        oldLoadedData.data.close();
      }
      return loadedData.data;
    },
    (_labelsId, options) => options?.signal,
  ),
  unloadLabels: (labelsId) => {
    const state = get();
    const loadedDataKey = state.loadedLabels.get(labelsId);
    if (loadedDataKey === undefined) {
      return false;
    }
    const loadedData = state.loadedLabelsData.get(loadedDataKey);
    if (loadedData === undefined) {
      throw new Error(`Data source for labels with ID ${labelsId} not loaded.`);
    }
    let destroy = true;
    for (const [otherLabelsId, otherLoadedData] of state.loadedLabels) {
      if (otherLabelsId !== labelsId && otherLoadedData === loadedDataKey) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedLabels.delete(labelsId);
      if (destroy) {
        draft.loadedLabelsData.delete(loadedDataKey);
      }
    });
    if (destroy) {
      loadedData.data.close();
    }
    return true;
  },
});

function createInitialLabelsSliceState(): LabelsSliceState {
  return {
    labels: [],
    loadedLabels: new Map(),
    loadedLabelsData: new Map(),
  };
}
