// workaround for @microsoft/api-extractor not yet supporting ES2025
export type Float16Array = typeof globalThis extends {
  Float16Array: { prototype: infer TFloat16ArrayPrototype };
}
  ? TFloat16ArrayPrototype
  : never;

/** Union of signed integer typed arrays */
export type IntArray = Int8Array | Int16Array | Int32Array;

/** Union of unsigned integer typed arrays */
export type UintArray = Uint8Array | Uint16Array | Uint32Array;

/** Union of floating-point typed arrays */
export type FloatArray = Float16Array | Float32Array | Float64Array;

/** Union of all numeric typed arrays */
export type TypedArray = IntArray | UintArray | FloatArray;

/** A union of all array types that can hold numeric values */
export type NumericArray = number[] | TypedArray;

/** A union of all array types */
export type GenericArray<T> = T extends number
  ? NumericArray
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

/** Point cloud geometry consisting of separate arrays for x and y coordinates */
export type PointsGeometry = {
  /** X coordinates of the points */
  xs: Float32Array;

  /** Y coordinates of the points */
  ys: Float32Array;
};

/**
 * Geometry for shapes (multi-polygons) stored in CSR-style format
 *
 * Shapes are organized in a shapes -> polygons -> rings -> vertices structure,
 * using CSR-style offset arrays to define the relationships between these elements.
 * Typed arrays are used for efficient storage and transfer across worker boundaries.
 *
 * - Shape `s` owns polygons `[shapePolygonOffsets[s], shapePolygonOffsets[s+1])`
 * - Polygon `p` owns rings `[polygonRingOffsets[p], polygonRingOffsets[p+1])`
 * - Ring `r` owns vertices `[ringVertexOffsets[r], ringVertexOffsets[r+1])`
 * - Vertex `v` has coordinates at `coords[2*v]` (x) and `coords[2*v + 1]` (y)
 */
export type ShapesGeometry = {
  /**
   * Shape --> polygon offsets
   *
   * Length: number of shapes + 1 (last entry is total polygon count)
   *
   * One entry per shape (multi-polygon), giving the starting polygon index for each shape.
   */
  shapePolygonOffsets: Uint32Array;

  /**
   * Polygon --> ring offsets
   *
   * Length: number of polygons + 1 (last entry is total ring count)
   *
   * One entry per polygon, giving the starting ring index for each polygon; the first ring is the shell, and any subsequent rings are holes.
   */
  polygonRingOffsets: Uint32Array;

  /**
   * Ring --> vertex offsets
   *
   * Length: number of rings + 1 (last entry is total vertex count)
   *
   * One entry per ring, giving the starting vertex index for each ring; the last vertex of a ring is implicitly connected to the first vertex.
   */
  ringVertexOffsets: Uint32Array;

  /**
   * Vertex coordinates
   *
   * Length: 2 * number of vertices
   *
   * Two entries per vertex, giving the x and y coordinates of each vertex; the coordinates of vertex i are at indices 2*i and 2*i + 1 (interleaved).
   */
  coords: Float32Array;
};
