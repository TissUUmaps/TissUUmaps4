import type OpenSeadragon from "openseadragon";

/** A mapping from string keys (groups) to values with an optional default value */
export type ValueMap<TValue> = {
  values: { [key: string]: TValue };
  defaultValue?: TValue;
};

/** A named mapping from string keys (groups) to values with an optional default value */
export type NamedValueMap<TValue> = {
  id: string;
  name: string;
} & ValueMap<TValue>;

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

/** Similarity transform */
export type SimilarityTransform = {
  /** Scale factor */
  scale: number;

  /** Rotation around origin, in degrees */
  rotation: number;

  /** Translation, applied after scaling and rotation */
  translation: { x: number; y: number };
};

/** OpenSeadragon viewer options (see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options) */
export type ViewerOptions = Omit<OpenSeadragon.Options, "element"> & {
  // References to DOM elements cannot be handled by Zustand!
  navigatorElement?: never;
  toolbar?: string;
  zoomInButton?: string;
  zoomOutButton?: string;
  homeButton?: string;
  fullPageButton?: string;
  rotateLeftButton?: string;
  rotateRightButton?: string;
  previousButton?: string;
  nextButton?: string;
  referenceStripElement?: never;
};

/** WebGL draw options */
export type DrawOptions = {
  /** Point size factor */
  pointSizeFactor: number;

  /** Shape stroke width */
  shapeStrokeWidth: number;

  /** Number of scanlines per shapes object */
  numShapesScanlines: number;
};
