import { type Color } from "../types/color";
import { type Marker } from "../types/marker";
import { type DrawOptions, type ViewerOptions } from "../types/options";
import { type NamedValueMap } from "../types/valueMap";
import { type Model, type RawModel, createModel } from "./base";
import { type Image, type RawImage, createImage } from "./image";
import { type Labels, type RawLabels, createLabels } from "./labels";
import { type Layer, type RawLayer, createLayer } from "./layer";
import { type Points, type RawPoints, createPoints } from "./points";
import { type RawShapes, type Shapes, createShapes } from "./shapes";
import { type RawTable, type Table, createTable } from "./table";

export const projectDefaults = {
  markerMaps: [],
  sizeMaps: [],
  colorMaps: [],
  visibilityMaps: [],
  opacityMaps: [],
  drawOptions: {
    pointSizeFactor: 1,
    shapeStrokeWidth: 1,
    numShapesScanlines: 512,
  } as DrawOptions,
  viewerOptions: {
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
  } as ViewerOptions,
  viewerAnimationStartOptions: {
    immediateRender: false,
    imageLoaderLimit: 1,
  } as ViewerOptions,
  viewerAnimationFinishOptions: {
    immediateRender: true, // set to true, even if initially set to false
  } as ViewerOptions,
};

/** A TissUUmaps project */
export interface RawProject extends RawModel {
  /**
   * Project name
   */
  name: string;

  /**
   * Layers
   */
  layers?: RawLayer[];

  /**
   * Images
   */
  images?: RawImage[];

  /**
   * Labels
   */
  labels?: RawLabels[];

  /**
   * Points
   */
  points?: RawPoints[];

  /**
   * Shapes
   */
  shapes?: RawShapes[];

  /**
   * Tables
   */
  tables?: RawTable[];

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
  colorMaps?: NamedValueMap<Color>[];

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
 * A {@link RawProject} with default values applied
 */
export type Project = Model &
  Required<Pick<RawProject, keyof typeof projectDefaults>> &
  Omit<
    RawProject,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof Model
    | keyof typeof projectDefaults
    | ("layers" | "images" | "labels" | "points" | "shapes" | "tables")
  > & {
    layers: Layer[];
    images: Image[];
    labels: Labels[];
    points: Points[];
    shapes: Shapes[];
    tables: Table[];
  };

/**
 * Creates a {@link Project} from a {@link RawProject} by applying default values
 *
 * @param rawProject - The raw project
 * @returns The complete project with default values applied
 */
export function createProject(rawProject: RawProject): Project {
  return {
    ...createModel(rawProject),
    ...projectDefaults,
    ...rawProject,
    layers: rawProject.layers?.map(createLayer) ?? [],
    images: rawProject.images?.map(createImage) ?? [],
    labels: rawProject.labels?.map(createLabels) ?? [],
    points: rawProject.points?.map(createPoints) ?? [],
    shapes: rawProject.shapes?.map(createShapes) ?? [],
    tables: rawProject.tables?.map(createTable) ?? [],
  };
}
