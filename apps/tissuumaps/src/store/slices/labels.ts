import { deepEqual } from "fast-equals";

import type {
  Labels,
  LabelsData,
  LabelsDataSource,
  ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import type { TissUUmapsStateCreator } from "../index";

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
      newDataSource?: LabelsDataSource;
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
      const {
        signal,
        reload = false,
        onProgress,
        newDataSource,
      } = options ?? {};
      signal?.throwIfAborted();

      const state = get();
      const labels = state.labels.find((labels) => labels.id === labelsId);
      if (labels === undefined) {
        throw new Error(`Labels with ID ${labelsId} not found.`);
      }
      const dataSource = newDataSource ?? labels.dataSource;

      let oldLoadedData;
      const oldLoadedDataKey = state.loadedLabels.get(labelsId);
      if (oldLoadedDataKey !== undefined) {
        oldLoadedData = state.loadedLabelsData.get(oldLoadedDataKey);
        if (
          !reload &&
          newDataSource === undefined &&
          oldLoadedData !== undefined
        ) {
          return oldLoadedData.data;
        }
      }

      let existingLoadedData = oldLoadedData;
      if (existingLoadedData === undefined) {
        for (const [key, value] of state.loadedLabelsData) {
          if (deepEqual(value.dataSource, dataSource)) {
            existingLoadedData = value;
            if (!reload) {
              set((draft) => {
                draft.loadedLabels.set(labelsId, key);
                if (newDataSource !== undefined) {
                  const labelsDraft = draft.labels.find(
                    (labels) => labels.id === labelsId,
                  )!;
                  labelsDraft.dataSource = newDataSource;
                }
              });
              return existingLoadedData.data;
            }
            break;
          }
        }
      }

      let data = existingLoadedData?.data;
      if (reload || newDataSource !== undefined || data === undefined) {
        const dataProvider = state.labelsDataProviders.get(dataSource.type);
        if (dataProvider === undefined) {
          throw new Error(
            `No labels data provider registered for data source type ${dataSource.type}.`,
          );
        }
        data = await dataProvider.open(dataSource, {
          signal,
          onProgress,
          workspace: state.workspace,
        });
        if (signal?.aborted) {
          data.close();
          signal.throwIfAborted();
        }
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
      }

      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedLabelsData) {
          if (deepEqual(value.dataSource, dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedLabelsData.has(loadedDataKey));
        }
        draft.loadedLabelsData.set(loadedDataKey, { dataSource, data });
        draft.loadedLabels.set(labelsId, loadedDataKey);
        if (newDataSource !== undefined) {
          const labelsDraft = draft.labels.find(
            (labels) => labels.id === labelsId,
          )!;
          labelsDraft.dataSource = newDataSource;
        }
      });

      if (
        existingLoadedData !== undefined &&
        existingLoadedData.data !== data
      ) {
        existingLoadedData.data.close();
      }

      return data;
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
