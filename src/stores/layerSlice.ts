import { ILayerModel } from "../models/layer";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type LayerSlice = LayerSliceState & LayerSliceActions;

export type LayerSliceState = {
  layers: Map<string, ILayerModel>;
};

export type LayerSliceActions = {
  setLayer: (layerId: string, layer: ILayerModel, layerIndex?: number) => void;
  deleteLayer: (layerId: string) => void;
};

export const createLayerSlice: BoundStoreStateCreator<LayerSlice> = (set) => ({
  ...initialLayerSliceState,
  setLayer: (layerId, layer, layerIndex) => {
    set((draft) => {
      draft.layers = MapUtils.cloneAndSet(
        draft.layers,
        layerId,
        layer,
        layerIndex,
      );
    });
  },
  deleteLayer: (layerId) => {
    set((draft) => draft.layers.delete(layerId));
  },
});

const initialLayerSliceState: LayerSliceState = {
  layers: new Map<string, ILayerModel>(),
};
