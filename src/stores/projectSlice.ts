import { IImageModel } from "../models/image";
import { ILabelsModel } from "../models/labels";
import { ILayerModel } from "../models/layer";
import { IPointsModel } from "../models/points";
import { IProjectModel } from "../models/project";
import { IShapesModel } from "../models/shapes";
import { ITableModel } from "../models/table";
import MapUtils from "../utils/MapUtils";
import { SharedStoreSliceCreator } from "./sharedStore";

export type ProjectSlice = ProjectState & ProjectActions;

export type ProjectState = IProjectModel;

export type ProjectActions = {
  setLayer: (layerId: string, layer: ILayerModel, layerIndex?: number) => void;
  deleteLayer: (layerId: string) => void;
  setImage: (imageId: string, image: IImageModel, imageIndex?: number) => void;
  deleteImage: (imageId: string) => void;
  setLabels: (
    labelsId: string,
    labels: ILabelsModel,
    labelsIndex?: number,
  ) => void;
  deleteLabels: (labelsId: string) => void;
  setPoints: (
    pointsId: string,
    points: IPointsModel,
    pointsIndex?: number,
  ) => void;
  deletePoints: (pointsId: string) => void;
  setShapes: (
    shapesId: string,
    shapes: IShapesModel,
    shapesIndex?: number,
  ) => void;
  deleteShapes: (shapesId: string) => void;
  setTable: (tableId: string, table: ITableModel, tableIndex?: number) => void;
  deleteTable: (tableId: string) => void;
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setLayer: (layerId, layer, layerIndex) =>
    set((draft) => {
      draft.layers = MapUtils.cloneAndSet(
        draft.layers ?? new Map(),
        layerId,
        layer,
        layerIndex,
      );
    }),
  deleteLayer: (layerId) => set((draft) => draft.layers?.delete(layerId)),
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
  setTable: (tableId, table, tableIndex) =>
    set((draft) => {
      draft.tables = MapUtils.cloneAndSet(
        draft.tables ?? new Map(),
        tableId,
        table,
        tableIndex,
      );
    }),
  deleteTable: (tableId) => set((draft) => draft.tables?.delete(tableId)),
});

const initialProjectState: ProjectState = {
  name: "New project",
};
