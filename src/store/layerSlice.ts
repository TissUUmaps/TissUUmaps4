import { CompleteLayer } from "../model/layer";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type LayerSlice = LayerSliceState & LayerSliceActions;

export type LayerSliceState = {
  layerMap: Map<string, CompleteLayer>;
};

export type LayerSliceActions = {
  addLayer: (layer: CompleteLayer, index?: number) => void;
  deleteLayer: (layer: CompleteLayer) => void;
  deleteLayerByID: (layerId: string) => void;
  clearLayers: () => void;
};

export const createLayerSlice: BoundStoreStateCreator<LayerSlice> = (
  set,
  get,
) => ({
  ...initialLayersSliceState,
  addLayer: (layer, index) => {
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
    set((draft) => {
      draft.imageMap.forEach((image) => {
        image.layerConfigs = image.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId !== layer.id,
        );
      });
      draft.labelsMap.forEach((labels) => {
        labels.layerConfigs = labels.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId !== layer.id,
        );
      });
      draft.pointsMap.forEach((points) => {
        points.layerConfigs = points.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId !== layer.id,
        );
      });
      draft.shapesMap.forEach((shapes) => {
        shapes.layerConfigs = shapes.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId !== layer.id,
        );
      });
      draft.layerMap.delete(layer.id);
    });
  },
  deleteLayerByID: (layerId) => {
    const state = get();
    const layer = state.layerMap.get(layerId);
    if (layer === undefined) {
      throw new Error(`Layer with ID ${layerId} not found.`);
    }
    state.deleteLayer(layer);
  },
  clearLayers: () => {
    const state = get();
    state.layerMap.forEach((layer) => {
      state.deleteLayer(layer);
    });
    set(initialLayersSliceState);
  },
});

const initialLayersSliceState: LayerSliceState = {
  layerMap: new Map(),
};
