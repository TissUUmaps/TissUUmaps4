import { TileSourceImageDataSourceOptions } from "../datasources/tilesource";
import { ImageModel } from "../models/image";
import { LabelsModel } from "../models/labels";
import { LayerModel } from "../models/layer";
import { PointsModel } from "../models/points";
import { ProjectModel } from "../models/project";
import { ShapesModel } from "../models/shapes";
import MapUtils from "../utils/MapUtils";
import { SharedStoreSliceCreator } from "./sharedStore";

export type ProjectSlice = ProjectState & ProjectActions;

export type ProjectState = ProjectModel;

export type ProjectActions = {
  setLayer: (layerId: string, layer: LayerModel, layerIndex?: number) => void;
  deleteLayer: (layerId: string) => void;
  setImage: (imageId: string, image: ImageModel, imageIndex?: number) => void;
  deleteImage: (imageId: string) => void;
  setLabels: (
    labelsId: string,
    labels: LabelsModel,
    labelsIndex?: number,
  ) => void;
  deleteLabels: (labelsId: string) => void;
  setPoints: (
    pointsId: string,
    points: PointsModel,
    pointsIndex?: number,
  ) => void;
  deletePoints: (pointsId: string) => void;
  setShapes: (
    shapesId: string,
    shapes: ShapesModel,
    shapesIndex?: number,
  ) => void;
  deleteShapes: (shapesId: string) => void;
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setLayer: (layerId, layer, layerIndex) =>
    set((draft) => {
      draft.layers = MapUtils.cloneAndSet(
        draft.layers,
        layerId,
        layer,
        layerIndex,
      );
    }),
  deleteLayer: (layerId) => set((draft) => draft.layers.delete(layerId)),
  setImage: (imageId, image, imageIndex) =>
    set((draft) => {
      draft.images = MapUtils.cloneAndSet(
        draft.images ?? new Map(),
        imageId,
        image,
        imageIndex,
      );
    }),
  deleteImage: (imageId) => set((draft) => draft.images?.delete(imageId)),
  setLabels: (labelsId, labels, labelsIndex) =>
    set((draft) => {
      draft.labels = MapUtils.cloneAndSet(
        draft.labels ?? new Map(),
        labelsId,
        labels,
        labelsIndex,
      );
    }),
  deleteLabels: (labelsId) => set((draft) => draft.labels?.delete(labelsId)),
  setPoints: (pointsId, points, pointsIndex) =>
    set((draft) => {
      draft.points = MapUtils.cloneAndSet(
        draft.points ?? new Map(),
        pointsId,
        points,
        pointsIndex,
      );
    }),
  deletePoints: (pointsId) => set((draft) => draft.points?.delete(pointsId)),
  setShapes: (shapesId, shapes, shapesIndex) =>
    set((draft) => {
      draft.shapes = MapUtils.cloneAndSet(
        draft.shapes ?? new Map(),
        shapesId,
        shapes,
        shapesIndex,
      );
    }),
  deleteShapes: (shapesId) => set((draft) => draft.shapes?.delete(shapesId)),
});

// TODO remove dummy data
const initialProjectState: ProjectState = {
  name: "Dummy project",
  layers: new Map([["dummy", { name: "Dummy layer" }]]),
  images: new Map([
    [
      "dummy",
      {
        name: "Dummy image",
        dataSource: {
          type: "tilesource",
          tileSource: {
            type: "image",
            url: "https://openseadragon.github.io/example-images/grand-canyon-landscape-overlooking.jpg",
            crossOriginPolicy: "Anonymous",
            ajaxWithCredentials: false,
          },
        } as TileSourceImageDataSourceOptions,
        layerConfigs: new Map([["dummy", { layerId: "dummy" }]]),
      },
    ],
  ]),
};
