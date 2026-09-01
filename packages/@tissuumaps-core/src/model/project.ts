import type { OpenSeadragonOptions, WebGLOptions } from "../types/render";
import { type Model, type RawModel, createModel } from "./base";
import { type Image, type RawImage, createImage } from "./image";
import { type Labels, type RawLabels, createLabels } from "./labels";
import { type Layer, type RawLayer, createLayer } from "./layer";
import { type Points, type RawPoints, createPoints } from "./points";
import type { Color, DefaultMap, Marker } from "./primitives";
import { type RawShapes, type Shapes, createShapes } from "./shapes";
import { type RawTable, type Table, createTable } from "./table";

/**
 * Default values for {@link RawProject}
 */
export const projectDefaults = {
  markerMaps: [],
  sizeMaps: [],
  colorMaps: [],
  visibilityMaps: [],
  opacityMaps: [],
  osOptions: {
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
    },
    viewerAnimationStartOptions: {
      immediateRender: false,
      imageLoaderLimit: 1,
    },
    viewerAnimationFinishOptions: {
      immediateRender: true, // set to true, even if initially set to false
    },
  },
  glOptions: {
    pointsRenderOptions: {
      globalPointSizeFactor: 1,
    },
    shapesRenderOptions: {
      strokeWidth: 1,
      numScanlines: 512,
    },
  },
} as const satisfies Partial<RawProject>;

/**
 * A TissUUmaps project
 *
 * Top-level container that assembles layers, data objects (images, labels,
 * points, shapes), tables, group-to-value maps, and viewer/render options
 * into a single serializable configuration.
 */
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
   * Project-global marker maps, referenced by {@link GroupByConfig} marker configurations
   *
   * @defaultValue {@link projectDefaults.markerMaps}
   */
  markerMaps?: DefaultMap<Marker>[];

  /**
   * Project-global size maps, referenced by {@link GroupByConfig} size configurations
   *
   * @defaultValue {@link projectDefaults.sizeMaps}
   */
  sizeMaps?: DefaultMap<number>[];

  /**
   * Project-global color maps, referenced by {@link GroupByConfig} color configurations
   *
   * @defaultValue {@link projectDefaults.colorMaps}
   */
  colorMaps?: DefaultMap<Color>[];

  /**
   * Project-global visibility maps, referenced by {@link GroupByConfig} visibility configurations
   *
   * @defaultValue {@link projectDefaults.visibilityMaps}
   */
  visibilityMaps?: DefaultMap<boolean>[];

  /**
   * Project-global opacity maps, referenced by {@link GroupByConfig} opacity configurations
   *
   * @defaultValue {@link projectDefaults.opacityMaps}
   */
  opacityMaps?: DefaultMap<number>[];

  /**
   * OpenSeadragon viewer options for images/labels
   *
   * @defaultValue {@link projectDefaults.osOptions}
   * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
   */
  osOptions?: OpenSeadragonOptions;

  /**
   * WebGL render options for points/shapes
   *
   * @defaultValue {@link projectDefaults.glOptions}
   */
  glOptions?: WebGLOptions;
}

/**
 * A {@link RawProject} with {@link projectDefaults} applied
 */
export type Project = Model &
  Required<Pick<RawProject, keyof typeof projectDefaults>> &
  Omit<
    RawProject,
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
 * Creates a {@link Project} from a {@link RawProject} by applying {@link projectDefaults}
 *
 * @param rawProject - The raw project
 * @returns The complete project with default values applied
 */
export function createProject(rawProject: RawProject): Project {
  return {
    ...createModel(rawProject),
    ...structuredClone(projectDefaults),
    ...structuredClone(rawProject),
    layers: rawProject.layers?.map(createLayer) ?? [],
    images: rawProject.images?.map(createImage) ?? [],
    labels: rawProject.labels?.map(createLabels) ?? [],
    points: rawProject.points?.map(createPoints) ?? [],
    shapes: rawProject.shapes?.map(createShapes) ?? [],
    tables: rawProject.tables?.map(createTable) ?? [],
  };
}
