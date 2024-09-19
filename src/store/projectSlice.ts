import Image from "../model/image";
import Layer from "../model/layer";
import { defaultPointsSettings } from "../model/points";
import Project, { defaultProjectSettings } from "../model/project";
import OrderedMap from "../utils/OrderedMap";
import { SharedStoreSliceCreator } from "./sharedStore";

export type ProjectState = Project;

export type ProjectActions = {
  setLayer: (layerId: string, layer: Layer, layerIndex?: number) => void;
  deleteLayer: (layerId: string) => void;
  setLayerImage: (
    layerId: string,
    imageId: string,
    image: Image,
    imageIndex?: number,
  ) => void;
  deleteLayerImage: (layerId: string, imageId: string) => void;
  markLayerImagesClean: () => void;
  setActivePointsSettingsProfile: (
    pointsId: string,
    activeProfileId: string,
  ) => void;
};

export type ProjectSlice = ProjectState & ProjectActions;

const initialProjectState: ProjectState = {
  name: "New project",
  layers: new OrderedMap(),
  allPoints: new OrderedMap([
    [
      "dummy",
      {
        name: "My points",
        data: { type: "hdf5", config: {} },
        settings: { ...defaultPointsSettings },
      },
    ],
  ]), // TODO remove dummy data
  allShapes: new OrderedMap(),
  settings: defaultProjectSettings,
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setLayer: (layerId, layer, layerIndex) =>
    set((draft) => {
      const layers = new OrderedMap(draft.layers);
      if (layers.has(layerId)) {
        layers.delete(layerId);
      }
      if (layerIndex !== undefined) {
        layers.splice(layerIndex, 0, [layerId, layer]);
      } else {
        layers.set(layerId, layer);
      }
      draft.layers = layers;
    }),
  deleteLayer: (layerId) =>
    set((draft) => {
      draft.layers.delete(layerId);
    }),
  setLayerImage: (layerId, imageId, image, imageIndex) =>
    set((draft) => {
      const layer = draft.layers.get(layerId);
      if (!layer) {
        throw new Error(`Layer not found: ${layerId}`);
      }
      const images = new OrderedMap(layer.images);
      if (images.has(imageId)) {
        images.delete(imageId);
      }
      if (imageIndex !== undefined) {
        images.splice(imageIndex, 0, [imageId, image]);
      } else {
        images.set(imageId, image);
      }
      layer.images = images;
    }),
  deleteLayerImage: (layerId, imageId) =>
    set((draft) => {
      const layer = draft.layers.get(layerId);
      if (!layer) {
        throw new Error(`Layer not found: ${layerId}`);
      }
      layer.images.delete(imageId);
    }),
  markLayerImagesClean: () =>
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
