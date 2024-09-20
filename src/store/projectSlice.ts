import Image from "../model/image";
import Layer from "../model/layer";
import { defaultPointsSettings } from "../model/points";
import Project, { defaultProjectSettings } from "../model/project";
import MapUtils from "../utils/MapUtils";
import { SharedStoreSliceCreator } from "./sharedStore";

export type ProjectState = Project;

export type ProjectActions = {
  setLayer: (layerId: string, layer: Layer, layerIndex?: number) => void;
  deleteLayer: (layerId: string) => void;
  setImage: (
    layerId: string,
    imageId: string,
    image: Image,
    imageIndex?: number,
  ) => void;
  deleteImage: (layerId: string, imageId: string) => void;
  cleanImages: () => void;
  setActivePointsSettingsProfile: (
    pointsId: string,
    activeProfileId: string,
  ) => void;
};

export type ProjectSlice = ProjectState & ProjectActions;

const initialProjectState: ProjectState = {
  name: "New project",
  layers: new Map(),
  allPoints: new Map([
    [
      "dummy",
      {
        name: "My points",
        data: { type: "hdf5", config: {} },
        settings: { ...defaultPointsSettings },
      },
    ],
  ]), // TODO remove dummy data
  allShapes: new Map(),
  settings: defaultProjectSettings,
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setLayer: (layerId, layer, layerIndex) =>
    set((draft) => {
      if (draft.layers.has(layerId)) {
        draft.layers.delete(layerId);
      }
      if (layerIndex !== undefined) {
        draft.layers = MapUtils.splice(draft.layers, layerIndex, 0, [
          layerId,
          layer,
        ]);
      } else {
        draft.layers.set(layerId, layer);
      }
    }),
  deleteLayer: (layerId) =>
    set((draft) => {
      draft.layers.delete(layerId);
    }),
  setImage: (layerId, imageId, image, imageIndex) =>
    set((draft) => {
      const layer = draft.layers.get(layerId);
      if (!layer) {
        throw new Error(`Layer not found: ${layerId}`);
      }
      if (layer.images.has(imageId)) {
        layer.images.delete(imageId);
      }
      if (imageIndex !== undefined) {
        layer.images = MapUtils.splice(layer.images, imageIndex, 0, [
          imageId,
          image,
        ]);
      } else {
        layer.images.set(imageId, image);
      }
    }),
  deleteImage: (layerId, imageId) =>
    set((draft) => {
      const layer = draft.layers.get(layerId);
      if (!layer) {
        throw new Error(`Layer not found: ${layerId}`);
      }
      layer.images.delete(imageId);
    }),
  cleanImages: () =>
    set((draft) => {
      for (const [, layer] of draft.layers) {
        for (const [, image] of layer.images) {
          image.update = false;
          image.reload = false;
        }
      }
    }),
  setActivePointsSettingsProfile: (pointsId, activeProfileId) =>
    set((draft) => {
      const points = draft.allPoints.get(pointsId);
      if (!points) {
        throw new Error(`Points not found: ${pointsId}`);
      }
      points.settings.activeProfileId = activeProfileId;
    }),
});
