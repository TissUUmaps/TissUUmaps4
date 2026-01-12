import { type Layer } from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type LayerSlice = LayerSliceState & LayerSliceActions;

export type LayerSliceState = {
  layers: Layer[];
};

export type LayerSliceActions = {
  addLayer: (layer: Layer, index?: number) => void;
  setLayer: (layerId: string, layer: Layer) => void;
  moveLayer: (layerId: string, newIndex: number) => void;
  deleteLayer: (layerId: string) => void;
  clearLayers: () => void;
};

export const createLayerSlice: TissUUmapsStateCreator<LayerSlice> = (
  set,
  get,
) => ({
  ...initialLayerSliceState,
  addLayer: (layer, index) => {
    const state = get();
    if (state.layers.find((x) => x.id === layer.id) !== undefined) {
      throw new Error(`Layer with ID ${layer.id} already exists.`);
    }
    set((draft) => {
      draft.layers.splice(index ?? draft.layers.length, 0, layer);
    });
  },
  setLayer: (layerId, layer) => {
    const state = get();
    const index = state.layers.findIndex((x) => x.id === layerId);
    if (index === -1) {
      throw new Error(`Layer with ID ${layerId} not found.`);
    }
    set((draft) => {
      draft.layers[index] = layer;
    });
  },
  moveLayer: (layerId, newIndex) => {
    const state = get();
    const oldIndex = state.layers.findIndex((layer) => layer.id === layerId);
    if (oldIndex === -1) {
      throw new Error(`Layer with ID ${layerId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const [layer] = draft.layers.splice(oldIndex, 1);
        draft.layers.splice(newIndex, 0, layer!);
      });
    }
  },
  deleteLayer: (layerId) => {
    const state = get();
    const index = state.layers.findIndex((layer) => layer.id === layerId);
    if (index === -1) {
      throw new Error(`Layer with ID ${layerId} not found.`);
    }
    set((draft) => {
      draft.layers.splice(index, 1);
    });
  },
  clearLayers: () => {
    const state = get();
    while (state.layers.length > 0) {
      state.deleteLayer(state.layers[0]!.id);
    }
    set(initialLayerSliceState);
  },
});

const initialLayerSliceState: LayerSliceState = {
  layers: [],
};
