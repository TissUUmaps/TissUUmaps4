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
   * Number of polygon edges of a typical shape that a scanline holds, when
   * rasterizing a shapes object
   *
   * The rasterizer divides a shapes object's bounding box into horizontal
   * scanlines, and each scanline into x-bins, and lists for each of them the
   * shapes and polygon edges reaching into it (including their padding, see
   * {@link shapePadding}), so that the fragment shader only has to consider
   * those. As edges are only assigned to scanlines, the scanline height bounds
   * the number of edges a fragment tests per shape. Fewer edges per scanline
   * mean fewer edges to test per fragment, at the cost of a larger scanline
   * texture, as shapes and edges spanning several scanlines are listed in each
   * of them.
   */
  edgesPerScanline: number;

  /**
   * Width of the x-bins of the scanlines a shapes object is rasterized into
   * (see {@link edgesPerScanline}), relative to the median width of its shapes
   *
   * The bin width bounds the number of shapes a fragment considers. Narrower
   * bins mean fewer shapes to consider per fragment, at the cost of a larger
   * scanline texture, as shapes spanning several bins are listed in each of
   * them.
   */
  binWidthFactor: number;

  /**
   * Fraction of the median height and width of the shapes that shapes and
   * polygon edges are padded by on either side when rasterizing a shapes
   * object (see {@link edgesPerScanline})
   *
   * Strokes and anti-aliased edges reaching beyond a shape are only drawn
   * within the padding, i.e. half the stroke width is limited to this fraction
   * of the median shape height vertically and of the median shape width
   * horizontally, whatever the numbers of scanlines and bins. Zoomed out far
   * enough that the padding is only about a pixel, even the thinnest strokes
   * and anti-aliased edges are cut off. Larger paddings let strokes reach
   * further, at the cost of more shapes and edges to test per fragment and a
   * larger scanline texture.
   */
  shapePadding: number;
};
