import { IModel } from "./base";
import { IImageModel } from "./image";
import { ILabelsModel } from "./labels";
import { ILayerModel } from "./layer";
import { IPointsModel } from "./points";
import { IShapesModel } from "./shapes";
import { ITableModel } from "./table";
import { BlendMode, Color, Marker } from "./types";

/** A project */
export interface IProjectModel extends IModel {
  /** Name */
  name: string;

  /** Layers */
  layers?: ILayerModel[];

  /** Images */
  images?: IImageModel[];

  /** Labels */
  labels?: ILabelsModel[];

  /** Points */
  points?: IPointsModel[];

  /** Shapes */
  shapes?: IShapesModel[];

  /** Tables */
  tables?: ITableModel[];

  /** Size maps */
  sizeMaps?: {
    id: string;
    name: string;
    values: { [key: string]: number };
  }[];

  /** Color maps */
  colorMaps?: {
    id: string;
    name: string;
    values: { [key: string]: Color };
  }[];

  /** Visibility maps */
  visibilityMaps?: {
    id: string;
    name: string;
    values: { [key: string]: boolean };
  }[];

  /** Opacity maps */
  opacityMaps?: {
    id: string;
    name: string;
    values: { [key: string]: number };
  }[];

  /** Marker maps */
  markerMaps?: {
    id: string;
    name: string;
    values: { [key: string]: Marker };
  }[];

  /** Blend mode (defaults to "over") */
  blendMode?: BlendMode;

  /** Point size factor (defaults to 1.0) */
  pointSizeFactor?: number;
}
