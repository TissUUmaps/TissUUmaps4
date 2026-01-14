import { type Model, type RawModel, createModel } from "./base";
import { defaultDrawOptions, defaultViewerOptions } from "./constants";
import { type Image, type RawImage, createImage } from "./image";
import { type Labels, type RawLabels, createLabels } from "./labels";
import { type Layer, type RawLayer, createLayer } from "./layer";
import { type Points, type RawPoints, createPoints } from "./points";
import { type RawShapes, type Shapes, createShapes } from "./shapes";
import { type RawTable, type Table, createTable } from "./table";
import {
  type Color,
  type DrawOptions,
  type Marker,
  type NamedValueMap,
  type ViewerOptions,
} from "./types";

/**
 * Default values for {@link RawProject}
 */
export const projectDefaults = {
  markerMaps: [],
  sizeMaps: [],
  colorMaps: [],
  visibilityMaps: [],
  opacityMaps: [],
  drawOptions: defaultDrawOptions,
  viewerOptions: defaultViewerOptions,
  viewerAnimationStartOptions: {
    immediateRender: false,
    imageLoaderLimit: 1,
  },
  viewerAnimationFinishOptions: {
    immediateRender: true, // set to true, even if initially set to false
  },
} as const satisfies Partial<RawProject>;

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
 * A {@link RawProject} with {@link projectDefaults} applied
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
