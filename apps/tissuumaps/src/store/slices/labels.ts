import { deepEqual } from "fast-equals";

import {
  type Labels,
  type LabelsData,
  type LabelsDataSource,
  type ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedLabels = {
  loadedDataSourceKey: string;
};

type LoadedLabelsDataSource = {
  dataSource: LabelsDataSource;
  data: LabelsData;
};

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labels: Labels[];
  loadedLabels: Map<string, LoadedLabels>;
  loadedLabelsDataSources: Map<string, LoadedLabelsDataSource>;
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
  ) => Promise<LoadedLabels>;
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
    for (const loadedDataSource of state.loadedLabelsDataSources.values()) {
      loadedDataSource.data.destroy();
    }
    set(createInitialLabelsSliceState());
  },
  loadLabels: deduplicate(
    async (labelsId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the labels are already loaded
      const state = get();
      const loadedLabels = state.loadedLabels.get(labelsId);
      if (loadedLabels !== undefined && !reload) {
        return loadedLabels;
      }
      // Find the labels and the corresponding data source (if loaded)
      const labels = state.labels.find((labels) => labels.id === labelsId);
      if (labels === undefined) {
        throw new Error(`Labels with ID ${labelsId} not found.`);
      }
      let oldLoadedDataSource: LoadedLabelsDataSource | undefined;
      for (const loadedDataSource of state.loadedLabelsDataSources.values()) {
        if (deepEqual(loadedDataSource.dataSource, labels.dataSource)) {
          oldLoadedDataSource = loadedDataSource;
          break;
        }
      }
      // Load the data source if not already loaded or if a reload has been requested
      let loadedDataSource = oldLoadedDataSource;
      if (loadedDataSource === undefined || reload) {
        const { dataStorageFactory } =
          state.labelsDataStorageRegistry.get(labels.dataSource.type) ?? {};
        if (dataStorageFactory === undefined) {
          throw new Error(
            `No labels data storage adapter registered for data source type ${labels.dataSource.type}.`,
          );
        }
        const dataStorage = dataStorageFactory(
          labels.dataSource,
          state.workspace,
        );
        const data = await dataStorage.loadLabels({ signal, onProgress });
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
          data.destroy();
          throw new DOMException(
            `Labels with ID ${labelsId} have been deleted or their data source has changed.`,
            "AbortError",
          );
        }
        loadedDataSource = { dataSource: labels.dataSource, data };
      }
      // Store the loaded labels and the corresponding data source in the state
      let newLoadedLabels: LoadedLabels;
      set((draft) => {
        let loadedDataSourceKey;
        for (const [key, value] of draft.loadedLabelsDataSources) {
          if (deepEqual(value.dataSource, loadedDataSource.dataSource)) {
            loadedDataSourceKey = key;
            break;
          }
        }
        if (loadedDataSourceKey === undefined) {
          do {
            loadedDataSourceKey = crypto.randomUUID();
          } while (draft.loadedLabelsDataSources.has(loadedDataSourceKey));
        }
        newLoadedLabels = { loadedDataSourceKey };
        draft.loadedLabels.set(labelsId, newLoadedLabels);
        draft.loadedLabelsDataSources.set(
          loadedDataSourceKey,
          loadedDataSource,
        );
      });
      // Clean up old data if the loaded data source has changed
      if (
        oldLoadedDataSource !== undefined &&
        oldLoadedDataSource.data !== loadedDataSource.data
      ) {
        oldLoadedDataSource.data.destroy();
      }
      return newLoadedLabels!;
    },
    (_labelsId, options) => options?.signal,
  ),
  unloadLabels: (labelsId) => {
    const state = get();
    const loadedLabels = state.loadedLabels.get(labelsId);
    if (loadedLabels === undefined) {
      return false;
    }
    const loadedDataSource = state.loadedLabelsDataSources.get(
      loadedLabels.loadedDataSourceKey,
    );
    if (loadedDataSource === undefined) {
      throw new Error(`Data source for labels with ID ${labelsId} not loaded.`);
    }
    let destroy = true;
    for (const [otherLabelsId, otherLoadedLabels] of state.loadedLabels) {
      if (
        otherLabelsId !== labelsId &&
        otherLoadedLabels.loadedDataSourceKey ===
          loadedLabels.loadedDataSourceKey
      ) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedLabels.delete(labelsId);
      if (destroy) {
        draft.loadedLabelsDataSources.delete(loadedLabels.loadedDataSourceKey);
      }
    });
    if (destroy) {
      loadedDataSource.data.destroy();
    }
    return true;
  },
});

function createInitialLabelsSliceState(): LabelsSliceState {
  return {
    labels: [],
    loadedLabels: new Map(),
    loadedLabelsDataSources: new Map(),
  };
}
