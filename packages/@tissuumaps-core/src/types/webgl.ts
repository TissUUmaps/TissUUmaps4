/**
 * Options for the WebGL renderers
 */
export type WebGLOptions = {
  /** Options for rendering the project's points */
  pointsRenderOptions: WebGLPointsRenderOptions;

  /** Options for rendering the project's shapes */
  shapesRenderOptions: WebGLShapesRenderOptions;
};

/**
 * Options for rendering points
 */
export type WebGLPointsRenderOptions = {
  /**
   * Unitless factor by which the size of every point is multiplied
   *
   * Applies on top of the layer- and object-level point size settings.
   */
  globalPointSizeFactor: number;
};

/**
 * Options for rendering shapes
 */
export type WebGLShapesRenderOptions = {
  /** Width of the shape outlines, in world coordinates */
  strokeWidth: number;

  /**
   * Number of horizontal scanlines a shapes object's bounding box is divided into
   *
   * For each scanline, the rasterizer precomputes which polygon edges cross it,
   * so that the fragment shader only has to consider those. More scanlines mean
   * fewer edges to test per fragment, at the cost of a larger scanline texture.
   */
  numScanlines: number;
};
