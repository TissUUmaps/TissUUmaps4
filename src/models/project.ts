import { IModel } from "./base";
import { IImageModel } from "./image";
import { ILabelsModel } from "./labels";
import { ILayerModel } from "./layer";
import { IPointsModel } from "./points";
import { IShapesModel } from "./shapes";
import { ITableModel } from "./table";
import { Color, DrawOptions, Marker, ViewerOptions } from "./types";

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

  /** WebGL draw options for points/shapes */
  drawOptions?: Partial<DrawOptions>;

  /**
   * OpenSeadragon viewer options for images/labels
   *
   * @see OpenSeadragonController for default values
   *
   * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
   */
  viewerOptions?: Partial<ViewerOptions>;

  /**
   * OpenSeadragon viewer options set when an animation starts
   *
   * Each option will be reset to the initial value when the animation finishes, unless overridden by `viewerAnimationFinishOptions`
   *
   * @see OpenSeadragonController for default values
   */
  viewerAnimationStartOptions?: Partial<ViewerOptions>;

  /**
   * OpenSeadragon viewer options set when an animation finishes
   *
   * @see OpenSeadragonController for default values
   */
  viewerAnimationFinishOptions?: Partial<ViewerOptions>;
}
