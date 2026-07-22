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
