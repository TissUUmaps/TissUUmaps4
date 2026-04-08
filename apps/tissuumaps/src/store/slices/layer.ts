import { type Layer, createLayer } from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "../index";

export type LayerSlice = LayerSliceState & LayerSliceActions;

export type LayerSliceState = {
  layers: Layer[];
};

export type LayerSliceActions = {
  addLayer: (layer: Layer, index?: number) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  moveLayer: (layerId: string, newIndex: number) => void;
  deleteLayer: (layerId: string) => boolean;
  clearLayers: () => void;
};

export const createLayerSlice: TissUUmapsStateCreator<LayerSlice> = (
  set,
  get,
) => ({
  ...createInitialLayerSliceState(),
  addLayer: (layer, index) => {
    const state = get();
    if (state.layers.some((x) => x.id === layer.id)) {
      throw new Error(`Layer with ID ${layer.id} already exists.`);
    }
    if (index !== undefined && (index < 0 || index > state.layers.length)) {
      throw new Error(`Index ${index} is out of bounds.`);
    }
    set((draft) => {
      draft.layers.splice(index ?? draft.layers.length, 0, layer);
    });
  },
  updateLayer: (layerId, updates) => {
    if (updates.id !== undefined) {
      throw new Error("Updating layer ID is not allowed.");
    }
    const state = get();
    const index = state.layers.findIndex((layer) => layer.id === layerId);
    if (index === -1) {
      throw new Error(`Layer with ID ${layerId} not found.`);
    }
    set((draft) => {
      draft.layers[index] = { ...draft.layers[index]!, ...updates };
    });
  },
  moveLayer: (layerId, newIndex) => {
    const state = get();
    if (newIndex < 0 || newIndex >= state.layers.length) {
      throw new Error(`New index ${newIndex} is out of bounds.`);
    }
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
    if (index !== -1) {
      set((draft) => {
        draft.layers.splice(index, 1);
      });
      return true;
    }
    return false;
  },
  clearLayers: () => {
    set(createInitialLayerSliceState());
  },
});

function createInitialLayerSliceState(): LayerSliceState {
  return {
    layers: [
      createLayer({
        id: crypto.randomUUID(),
        name: "Default",
      }),
    ],
  };
}
