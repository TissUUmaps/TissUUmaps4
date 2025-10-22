import OpenSeadragon from "openseadragon";

import { CATEGORICAL_COLOR_PALETTES } from "./palettes";

export type IntArray = Int8Array | Int16Array | Int32Array;
export type UintArray = Uint8Array | Uint16Array | Uint32Array;
export type FloatArray = Float32Array | Float64Array; // Float16Array will be part of ECMAScript 2025
export type TypedArray = IntArray | UintArray | FloatArray;
export type MappableArrayLike<T> = ArrayLike<T> & {
  map<U>(
    callbackFn: (element: T, index: number, array: MappableArrayLike<T>) => U,
    thisArg?: unknown,
  ): MappableArrayLike<U>;
};

/** A color in RGB format */
export type Color = {
  /** Red component, between 0 and 255 */
  r: number;

  /** Green component, between 0 and 255 */
  g: number;

  /** Blue component, between 0 and 255 */
  b: number;
};

/** A marker shape (see marker atlas) */
export enum Marker {
  Cross,
  Diamond,
  Square,
  TriangleUp,
  Star,
  Clobber,
  Disc,
  HBar,
  VBar,
  TailedArrow,
  TriangleDown,
  Ring,
  X,
  Arrow,
  Gaussian,
}

export type ValueMap<TValue> = {
  values: { [key: string]: TValue };
  defaultValue?: TValue;
};

export type NamedValueMap<TValue> = {
  id: string;
  name: string;
} & ValueMap<TValue>;

export type ColorMap = ValueMap<Color> & {
  palette?: keyof typeof CATEGORICAL_COLOR_PALETTES;
};

export type NamedColorMap = {
  id: string;
  name: string;
} & ColorMap;

/** Link to a table column that holds values */
export type TableValuesColumn = {
  /** Table ID */
  tableId: string;

  /** Values column */
  valuesCol: string;
};

export function isTableValuesColumn(x: unknown): x is TableValuesColumn {
  return (
    (x as TableValuesColumn).tableId !== undefined &&
    (x as TableValuesColumn).valuesCol !== undefined
  );
}

/** Link to a table column that holds groups */
export type TableGroupsColumn = {
  /** Table ID */
  tableId: string;

  /** Groups column */
  groupsCol: string;
};

export function isTableGroupsColumn(x: unknown): x is TableGroupsColumn {
  return (
    (x as TableGroupsColumn).tableId !== undefined &&
    (x as TableGroupsColumn).groupsCol !== undefined
  );
}

/** Similarity transform */
export type SimilarityTransform = {
  /** Scale factor */
  scale: number;

  /** Rotation around origin, in degrees */
  rotation: number;

  /** Translation, applied after scaling and rotation */
  translation: { x: number; y: number };
};

/** OpenSeadragon viewer options */
export type ViewerOptions = Omit<OpenSeadragon.Options, "element"> & {
  // References to DOM elements cannot be handled by Zustand!
  zoomInButton?: string;
  zoomOutButton?: string;
  homeButton?: string;
  fullPageButton?: string;
  rotateLeftButton?: string;
  rotateRightButton?: string;
  nextButton?: string;
  previousButton?: string;
  referenceStripElement?: undefined;
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

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MultiPolygon = {
  polygons: Polygon[];
};

export type Polygon = {
  shell: Path;
  holes: Path[];
};

export type Path = Vertex[];

export type Vertex = { x: number; y: number };
