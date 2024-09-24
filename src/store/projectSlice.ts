import Image, { imageDefaults } from "../model/image";
import Layer, { layerDefaults } from "../model/layer";
import { pointsDefaults } from "../model/points";
import Project from "../model/project";
import { shapesDefaults } from "../model/shapes";
import {
  TILE_SOURCE_IMAGE_READER_TYPE,
  TileSourceImageReaderOptions,
} from "../readers/TileSourceImageReader";
import MapUtils from "../utils/MapUtils";
import { SharedStoreSliceCreator } from "./sharedStore";

export type ProjectState = Project;

export type ProjectActions = {
  setLayer: (layerId: string, layer: Layer, layerIndex?: number) => void;
  deleteLayer: (layerId: string) => void;
  setImage: (imageId: string, image: Image, imageIndex?: number) => void;
  deleteImage: (imageId: string) => void;
  setActivePointsSettings: (pointsId: string, activeSettingsId: string) => void;
};

export type ProjectSlice = ProjectState & ProjectActions;

const initialProjectState: ProjectState = {
  name: "New project",
  layers: new Map([
    [
      "dummy",
      {
        name: "My layer",
        ...layerDefaults,
      },
    ],
  ]), // TODO remove dummy layer
  images: new Map([
    [
      "dummy",
      {
        name: "My image",
        layers: ["dummy"],
        data: {
          type: TILE_SOURCE_IMAGE_READER_TYPE,
          tileSource: {
            type: "image",
            url: "https://openseadragon.github.io/example-images/grand-canyon-landscape-overlooking.jpg",
            crossOriginPolicy: "Anonymous",
            ajaxWithCredentials: false,
          },
        } as TileSourceImageReaderOptions,
        ...imageDefaults,
      },
    ],
  ]), // TODO remove dummy image
  points: new Map([
    [
      "dummy",
      {
        name: "My points",
        data: { type: "hdf5" },
        ...pointsDefaults,
      },
    ],
  ]), // TODO remove dummy points
  shapes: new Map([
    [
      "dummy",
      {
        name: "My shapes",
        layers: ["dummy"],
        data: { type: "geojson" },
        ...shapesDefaults,
      },
    ], // TODO remove dummy shapes
  ]),
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
  setImage: (imageId, image, imageIndex) =>
    set((draft) => {
      if (draft.images.has(imageId)) {
        draft.images.delete(imageId);
      }
      if (imageIndex !== undefined) {
        draft.images = MapUtils.splice(draft.images, imageIndex, 0, [
          imageId,
          image,
        ]);
      } else {
        draft.images.set(imageId, image);
      }
    }),
  deleteImage: (imageId) =>
    set((draft) => {
      draft.images.delete(imageId);
    }),
  setActivePointsSettings: (pointsId, activeSettingsId) =>
    set((draft) => {
      const points = draft.points.get(pointsId);
      if (!points) {
        throw new Error(`Points not found: ${pointsId}`);
      }
      points.activeSettingsId = activeSettingsId;
    }),
});
