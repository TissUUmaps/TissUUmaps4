/** Union of signed integer typed arrays */
export type IntArray = Int8Array | Int16Array | Int32Array;

/** Union of unsigned integer typed arrays */
export type UintArray = Uint8Array | Uint16Array | Uint32Array;

/** Union of floating-point typed arrays */
export type FloatArray = Float32Array | Float64Array; // Float16Array will be part of ECMAScript 2025

/** Union of all numeric typed arrays */
export type TypedArray = IntArray | UintArray | FloatArray;

/**
 * An {@link ArrayLike} that also exposes a `map` method, making it usable
 * in contexts that require both indexed access and functional transforms
 * (e.g. typed arrays and regular arrays)
 */
export type MappableArrayLike<T> = ArrayLike<T> & {
  map<U>(
    callbackFn: (element: T, index: number, array: MappableArrayLike<T>) => U,
    thisArg?: unknown,
  ): MappableArrayLike<U>;
};

/**
 * Interaction mode, determining how mouse events are interpreted
 */
export type InteractionMode =
  | "pan"
  | "drawRectangle"
  | "drawPolygon"
  | "drawFreehand";

/**
 * A callback function that receives progress updates as a percentage (0-100)
 *
 * @param progress - The current progress as a percentage (0-100)
 */
export type ProgressCallback = (progress: number) => void;

/** An axis-aligned rectangle defined by its top-left corner and dimensions */
export type Rect = {
  /** X coordinate of the top-left corner */
  x: number;
  /** Y coordinate of the top-left corner */
  y: number;
  /** Width of the rectangle */
  width: number;
  /** Height of the rectangle */
  height: number;
};

/** A geometry consisting of one or more {@link Polygon}s */
export type MultiPolygon = {
  /** The individual polygons that make up this multi-polygon */
  polygons: Polygon[];
};

/** A polygon defined by an outer shell and zero or more interior holes */
export type Polygon = {
  /** The outer boundary of the polygon */
  shell: Path;

  /** Interior rings that are subtracted from the polygon area */
  holes: Path[];
};

/** An ordered sequence of vertices forming an open or closed path */
export type Path = Vertex[];

/** A 2-D point */
export type Vertex = {
  /** X coordinate of the vertex */
  x: number;

  /** Y coordinate of the vertex */
  y: number;
};
