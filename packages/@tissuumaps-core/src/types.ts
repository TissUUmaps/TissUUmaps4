/** Union of signed integer typed arrays */
export type IntArray = Int8Array | Int16Array | Int32Array;

/** Union of unsigned integer typed arrays */
export type UintArray = Uint8Array | Uint16Array | Uint32Array;

/** Union of floating-point typed arrays */
export type FloatArray = Float32Array | Float64Array; // Float16Array will be part of ECMAScript 2025

/** Union of all numeric typed arrays */
export type TypedArray = IntArray | UintArray | FloatArray;

/** A union of all array types that can hold numeric values */
export type NumericArray<T extends number = number> = T[] | TypedArray;

/** A union of all array types */
export type GenericArray<T> = T extends number
  ? NumericArray<T>
  : unknown extends T
    ? NumericArray | T[]
    : T[];

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

/**
 * Flat, transfer-friendly representation of many shapes' geometry.
 *
 * A struct-of-arrays with CSR-style (offset) nesting shape → polygons → rings →
 * vertices. All arrays are `ArrayBuffer`-backed so the whole geometry transfers
 * zero-copy across a worker boundary. Coordinates are `Float32Array` to match
 * the GPU representation (the scanline texture is `RGBA32F`).
 *
 * - Shape `s` owns polygons `[shapePolygonOffsets[s], shapePolygonOffsets[s + 1])`.
 * - Polygon `p` owns rings `[polygonRingOffsets[p], polygonRingOffsets[p + 1])`;
 *   the first ring of each polygon is its shell, the rest are holes.
 * - Ring `r` owns vertices `[ringVertexOffsets[r], ringVertexOffsets[r + 1])`,
 *   each vertex being `(coords[2 * v], coords[2 * v + 1])`.
 */
export type ShapesGeometry = {
  /** Interleaved x, y per vertex; length `2 * vertexCount`. */
  coords: Float32Array;
  /** CSR ring → vertex offsets; length `ringCount + 1`. */
  ringVertexOffsets: Uint32Array;
  /** CSR polygon → ring offsets (first ring = shell); length `polygonCount + 1`. */
  polygonRingOffsets: Uint32Array;
  /** CSR shape → polygon offsets; length `shapeCount + 1`. */
  shapePolygonOffsets: Uint32Array;
};
