/** Dimensions of a two-dimensional object */
export type Dims = {
  /** The width of the object */
  width: number;
  /** The height of the object */
  height: number;
};

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
