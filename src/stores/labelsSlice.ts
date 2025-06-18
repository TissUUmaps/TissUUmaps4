import { ILabelsModel } from "../models/labels";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type LabelsSlice = LabelsSliceState & LabelsSliceActions;

export type LabelsSliceState = {
  labels: Map<string, ILabelsModel>;
};

export type LabelsSliceActions = {
  setLabels: (
    labelsId: string,
    labels: ILabelsModel,
    labelsIndex?: number,
  ) => void;
  deleteLabels: (labelsId: string) => void;
};

export const createLabelsSlice: BoundStoreStateCreator<LabelsSlice> = (
  set,
) => ({
  ...initialLabelsSliceState,
  setLabels: (labelsId, labels, labelsIndex) =>
    set((draft) => {
      draft.labels = MapUtils.cloneAndSet(
        draft.labels,
        labelsId,
        labels,
        labelsIndex,
      );
    }),
  deleteLabels: (labelsId) => set((draft) => draft.labels.delete(labelsId)),
});

const initialLabelsSliceState: LabelsSliceState = {
  labels: new Map<string, ILabelsModel>(),
};
