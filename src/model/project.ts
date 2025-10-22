import {
  DrawOptions,
  Marker,
  NamedColorMap,
  NamedValueMap,
  ViewerOptions,
} from "../types";
import { Model, ModelKeysWithDefaults, completeModel } from "./base";
import { Image } from "./image";
import { Labels } from "./labels";
import { Layer } from "./layer";
import { Points } from "./points";
import { Shapes } from "./shapes";
import { Table } from "./table";

/**
 * Default WebGL draw options of {@link Project}
 */
export const DEFAULT_PROJECT_DRAW_OPTIONS: DrawOptions = {
  pointSizeFactor: 1,
  shapeStrokeWidth: 1,
  numShapesScanlines: 512, // don't forget to update WebGLShapesController default too
};

/**
 * Default OpenSeadragon viewer options of {@link Project}
 */
export const DEFAULT_PROJECT_VIEWER_OPTIONS: ViewerOptions = {
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

/**
 * Default OpenSeadragon viewer animation start options of {@link Project}
 */
export const DEFAULT_PROJECT_VIEWER_ANIMATION_START_OPTIONS: ViewerOptions = {
  immediateRender: false,
  imageLoaderLimit: 1,
};

/**
 * Default OpenSeadragon viewer animation finish options of {@link Project}
 */
export const DEFAULT_PROJECT_VIEWER_ANIMATION_FINISH_OPTIONS: ViewerOptions = {
  immediateRender: true, // set to true, even if initially set to false
};

/** A TissUUmaps project */
export interface Project extends Model {
  /**
   * Project name
   */
  name: string;

  /**
   * Layers
   */
  layers?: Layer[];

  /**
   * Images
   */
  images?: Image[];

  /**
   * Labels
   */
  labels?: Labels[];

  /**
   * Points
   */
  points?: Points[];

  /**
   * Shapes
   */
  shapes?: Shapes[];

  /**
   * Tables
   */
  tables?: Table[];

  /**
   * Marker maps
   */
  markerMaps?: NamedValueMap<Marker>[];

  /**
   * Size maps
   */
  sizeMaps?: NamedValueMap<number>[];

  /**
   * Color maps
   */
  colorMaps?: NamedColorMap[];

  /**
   * Visibility maps
   */
  visibilityMaps?: NamedValueMap<boolean>[];

  /**
   * Opacity maps
   */
  opacityMaps?: NamedValueMap<number>[];

  /**
   * WebGL draw options for points/shapes
   */
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

/**
 * {@link Project} properties that have default values
 *
 * @internal
 */
export type ProjectKeysWithDefaults =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | ModelKeysWithDefaults
  | keyof Pick<
      Project,
      | "markerMaps"
      | "sizeMaps"
      | "colorMaps"
      | "visibilityMaps"
      | "opacityMaps"
      | "drawOptions"
      | "viewerOptions"
      | "viewerAnimationStartOptions"
      | "viewerAnimationFinishOptions"
    >;

/**
 * A {@link Project} with default values applied
 *
 * @internal
 */
export type CompleteProject = Required<Pick<Project, ProjectKeysWithDefaults>> &
  Omit<Project, ProjectKeysWithDefaults>;

/**
 * Creates a {@link CompleteProject} from a {@link Project} by applying default values
 *
 * @param project - The raw project
 * @returns The complete project with default values applied
 *
 * @internal
 */
export function completeProject(project: Project): CompleteProject {
  return {
    ...completeModel(project),
    markerMaps: project.markerMaps ?? [],
    sizeMaps: project.sizeMaps ?? [],
    colorMaps: project.colorMaps ?? [],
    visibilityMaps: project.visibilityMaps ?? [],
    opacityMaps: project.opacityMaps ?? [],
    drawOptions: DEFAULT_PROJECT_DRAW_OPTIONS,
    viewerOptions: DEFAULT_PROJECT_VIEWER_OPTIONS,
    viewerAnimationStartOptions: DEFAULT_PROJECT_VIEWER_ANIMATION_START_OPTIONS,
    viewerAnimationFinishOptions:
      DEFAULT_PROJECT_VIEWER_ANIMATION_FINISH_OPTIONS,
    ...project,
  };
}
