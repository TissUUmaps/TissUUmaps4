import type OpenSeadragon from "openseadragon";

/** A named mapping from string keys (groups) to typed values with an optional default value */
export type DefaultMap<TValue> = {
  /** Map ID, referenced from data object configurations */
  id: string;

  /** Human-readable map name */
  name: string;

  /** Mapping from group names to values */
  values: { [key: string]: TValue };

  /** Default value for groups not present in {@link values} */
  default?: TValue;
};

/** A marker shape (see marker atlas) */
export const Marker = {
  Cross: 0,
  Diamond: 1,
  Square: 2,
  TriangleUp: 3,
  Star: 4,
  Clobber: 5,
  Disc: 6,
  HBar: 7,
  VBar: 8,
  TailedArrow: 9,
  TriangleDown: 10,
  Ring: 11,
  X: 12,
  Arrow: 13,
  Gaussian: 14,
} as const;

/** A marker index corresponding to one of the entries in the {@link Marker} object */
export type Marker = (typeof Marker)[keyof typeof Marker];

/** A color in RGB format */
export type Color = {
  /** Red component, between 0 and 255 */
  r: number;

  /** Green component, between 0 and 255 */
  g: number;

  /** Blue component, between 0 and 255 */
  b: number;
};

/** Coordinate space */
export type CoordinateSpace =
  /** Data (e.g. pixel) space */
  | "data"
  /** Layer (e.g. physical) space */
  | "layer"
  /** World (i.e. global) space */
  | "world";

/** Similarity transform (uniform scale, rotation, translation, and flip) */
export type SimilarityTransform = {
  /** Horizontal reflection, applied before scaling, rotation, and translation */
  flip: boolean;

  /** Uniform scale factor (1 = no scaling) */
  scale: number;

  /** Rotation around origin, in degrees */
  rotation: number;

  /** Translation in X and Y, applied after scaling and rotation */
  translation: { x: number; y: number };
};

/**
 * OpenSeadragon viewer options
 *
 * DOM element references are excluded because they cannot be serialized by Zustand.
 * Button/toolbar properties accept element IDs (strings) instead.
 *
 * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
 */
export type ViewerOptions = Omit<OpenSeadragon.Options, "element"> & {
  navigatorElement?: never;

  /** Element ID of the toolbar container */
  toolbar?: string;

  /** Element ID of the zoom-in button */
  zoomInButton?: string;

  /** Element ID of the zoom-out button */
  zoomOutButton?: string;

  /** Element ID of the home (reset zoom) button */
  homeButton?: string;

  /** Element ID of the full-page toggle button */
  fullPageButton?: string;

  /** Element ID of the rotate-left button */
  rotateLeftButton?: string;

  /** Element ID of the rotate-right button */
  rotateRightButton?: string;

  /** Element ID of the previous-page button */
  previousButton?: string;

  /** Element ID of the next-page button */
  nextButton?: string;

  referenceStripElement?: never;
};

/** WebGL render options for rendering points and shapes */
export type RenderOptions = {
  /** Global point size scaling factor (unitless, multiplied with all point sizes) */
  pointSizeFactor: number;

  /** Shape stroke width, in pixels */
  shapeStrokeWidth: number;

  /** Number of scanlines used for rasterizing each shapes object (higher = more accurate but slower) */
  numShapesScanlines: number;
};
