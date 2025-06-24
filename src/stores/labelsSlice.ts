import { ILabelsData, ILabelsDataLoader } from "../data/labels";
import { ILabelsDataSourceModel, ILabelsModel } from "../models/labels";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labels: Map<string, ILabelsModel>;
  labelsData: Map<string, ILabelsData>;
  labelsDataLoaders: Map<
    string,
    ILabelsDataLoader<ILabelsDataSourceModel<string>>
  >;
};

export type LabelsSliceActions = {
  setLabels: (
    labelsId: string,
    labels: ILabelsModel,
    labelsIndex?: number,
  ) => void;
  loadLabels: (labelsId: string, labels?: ILabelsModel) => Promise<ILabelsData>;
  deleteLabels: (labelsId: string) => void;
  registerLabelsDataLoader: (
    labelsDataSourceType: string,
    labelsDataLoader: ILabelsDataLoader<ILabelsDataSourceModel<string>>,
  ) => void;
  unregisterLabelsDataLoader: (labelsDataSourceType: string) => void;
};

export const createLabelsSlice: BoundStoreStateCreator<LabelsSlice> = (
  set,
  get,
) => ({
  ...initialLabelsSliceState,
  setLabels: (labelsId, labels, labelsIndex) => {
    set((draft) => {
      draft.labels = MapUtils.cloneAndSet(
        draft.labels,
        labelsId,
        labels,
        labelsIndex,
      );
    });
  },
  loadLabels: async (labelsId, labels) => {
    const state = get();
    if (state.labelsData.has(labelsId)) {
      return state.labelsData.get(labelsId)!;
    }
    if (labels === undefined) {
      labels = state.labels.get(labelsId);
      if (labels === undefined) {
        throw new Error(`No labels found for ID: ${labelsId}`);
      }
    }
    const labelsDataLoader = state.labelsDataLoaders.get(
      labels.dataSource.type,
    );
    if (labelsDataLoader === undefined) {
      throw new Error(
        `No labels data loader registered for labels data source type: ${labels.dataSource.type}`,
      );
    }
    const labelsData = await labelsDataLoader.loadLabels(labels.dataSource);
    set((draft) => {
      draft.labelsData.set(labelsId, labelsData);
    });
    return labelsData;
  },
  deleteLabels: (labelsId) => {
    set((draft) => {
      draft.labels.delete(labelsId);
      draft.labelsData.delete(labelsId);
    });
  },
  registerLabelsDataLoader: (labelsDataSourceType, labelsDataLoader) => {
    set((draft) => {
      if (draft.labelsDataLoaders.has(labelsDataSourceType)) {
        console.warn(
          `Labels data loader was already registered for labels data source type: ${labelsDataSourceType}`,
        );
      }
      draft.labelsDataLoaders.set(labelsDataSourceType, labelsDataLoader);
    });
  },
  unregisterLabelsDataLoader: (labelsDataSourceType) => {
    set((draft) => {
      if (!draft.labelsDataLoaders.delete(labelsDataSourceType)) {
        console.warn(
          `No labels data loader registered for labels data source type: ${labelsDataSourceType}`,
        );
      }
    });
  },
});

const initialLabelsSliceState: LabelsSliceState = {
  labels: new Map<string, ILabelsModel>(),
  labelsData: new Map<string, ILabelsData>(),
  labelsDataLoaders: new Map<
    string,
    ILabelsDataLoader<ILabelsDataSourceModel<string>>
  >(),
};
