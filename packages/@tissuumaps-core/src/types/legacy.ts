/**
 * Interaction mode, determining how mouse events are interpreted
 */
export type InteractionMode =
  "pan" | "drawRectangle" | "drawPolygon" | "drawFreehand";

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
