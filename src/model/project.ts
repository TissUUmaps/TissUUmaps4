import {
  Color,
  DrawOptions,
  Marker,
  PropertyMap,
  ViewerOptions,
} from "../types";
import { RawModel, createModel } from "./base";
import { RawImage } from "./image";
import { RawLabels } from "./labels";
import { RawLayer } from "./layer";
import { RawPoints } from "./points";
import { RawShapes } from "./shapes";
import { RawTable } from "./table";

export const DEFAULT_DRAW_OPTIONS: DrawOptions = {
  pointSizeFactor: 1,
};
export const DEFAULT_VIEWER_OPTIONS: ViewerOptions = {
  minZoomImageRatio: 0,
  maxZoomPixelRatio: Infinity,
  preserveImageSizeOnResize: true,
  visibilityRatio: 0,
  animationTime: 0,
  gestureSettingsMouse: {
    flickEnabled: false,
  },
  gestureSettingsTouch: {
    flickEnabled: false,
  },
  gestureSettingsPen: {
    flickEnabled: false,
  },
  gestureSettingsUnknown: {
    flickEnabled: false,
  },
  zoomPerClick: 1,
  showNavigator: true,
  navigatorPosition: "BOTTOM_LEFT",
  maxImageCacheCount: 2000,
  showNavigationControl: false,
  imageSmoothingEnabled: false,
};
export const DEFAULT_VIEWER_ANIMATION_START_OPTIONS: ViewerOptions = {
  immediateRender: false,
  imageLoaderLimit: 1,
};
export const DEFAULT_VIEWER_ANIMATION_FINISH_OPTIONS: ViewerOptions = {
  immediateRender: true, // set to true, even if initially set to false
};

/** A project */
export interface RawProject extends RawModel {
  /** Name */
  name: string;

  /** Layers */
  layers?: RawLayer[];

  /** Images */
  images?: RawImage[];

  /** Labels */
  labels?: RawLabels[];

  /** Points */
  points?: RawPoints[];

  /** Shapes */
  shapes?: RawShapes[];

  /** Tables */
  tables?: RawTable[];

  /** Size maps */
  sizeMaps?: PropertyMap<number>[];

  /** Color maps */
  colorMaps?: PropertyMap<Color>[];

  /** Visibility maps */
  visibilityMaps?: PropertyMap<boolean>[];

  /** Opacity maps */
  opacityMaps?: PropertyMap<number>[];

  /** Marker maps */
  markerMaps?: PropertyMap<Marker>[];

  /** WebGL draw options for points/shapes */
  drawOptions?: DrawOptions;

  /**
   * OpenSeadragon viewer options for images/labels
   *
   * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
   */
  viewerOptions?: ViewerOptions;

  /**
   * OpenSeadragon viewer options set when an animation starts
   *
   * Each option will be reset to the initial value when the animation finishes, unless overridden by `viewerAnimationFinishOptions`
   *
   * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
   */
  viewerAnimationStartOptions?: ViewerOptions;

  /**
   * OpenSeadragon viewer options set when an animation finishes
   *
   * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
   */
  viewerAnimationFinishOptions?: ViewerOptions;
}

type DefaultedProjectKeys = keyof Omit<RawProject, "name">;

export type Project = Required<Pick<RawProject, DefaultedProjectKeys>> &
  Omit<RawProject, DefaultedProjectKeys>;

export function createProject(rawProject: RawProject): Project {
  return {
    ...createModel(rawProject),
    layers: [],
    images: [],
    labels: [],
    points: [],
    shapes: [],
    tables: [],
    sizeMaps: [],
    colorMaps: [],
    visibilityMaps: [],
    opacityMaps: [],
    markerMaps: [],
    drawOptions: DEFAULT_DRAW_OPTIONS,
    viewerOptions: DEFAULT_VIEWER_OPTIONS,
    viewerAnimationStartOptions: DEFAULT_VIEWER_ANIMATION_START_OPTIONS,
    viewerAnimationFinishOptions: DEFAULT_VIEWER_ANIMATION_FINISH_OPTIONS,
    ...rawProject,
  };
}
