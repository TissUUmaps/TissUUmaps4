import { ILayerModel } from "../models/layer";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type LayerSlice = LayerSliceState & LayerSliceActions;

export type LayerSliceState = {
  layerMap: Map<string, ILayerModel>;
};

export type LayerSliceActions = {
  setLayer: (layer: ILayerModel, index?: number) => void;
  deleteLayer: (layer: ILayerModel) => void;
};

export const createLayerSlice: BoundStoreStateCreator<LayerSlice> = (set) => ({
  ...initialLayerSliceState,
  setLayer: (layer, index) => {
    set((draft) => {
      draft.layerMap = MapUtils.cloneAndSpliceSet(
        draft.layerMap,
        layer.id,
        layer,
        index,
      );
    });
  },
  deleteLayer: (layer) => {
    set((draft) => draft.layerMap.delete(layer.id));
  },
});

const initialLayerSliceState: LayerSliceState = {
  // TODO remove test data
  layerMap: new Map<string, ILayerModel>([
    ["breast", { id: "breast", name: "Breast" }],
  ]),
};
