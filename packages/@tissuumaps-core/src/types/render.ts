import type OpenSeadragon from "openseadragon";

/**
 * OpenSeadragon options, as consumed by the `OpenSeadragonContext` of
 * `@tissuumaps/render`
 *
 * @see https://openseadragon.github.io/docs/OpenSeadragon.html#.Options
 */
export type OpenSeadragonOptions = {
  /** Options applied to the viewer and its tiled images */
  viewerOptions: OpenSeadragonViewerOptions;

  /** Options applied while the viewer is animating */
  viewerAnimationStartOptions: OpenSeadragonViewerOptions;

  /**
   * Options applied once the viewer stopped animating, on top of the restored
   * pre-animation values
   */
  viewerAnimationFinishOptions: OpenSeadragonViewerOptions;
};

/**
 * OpenSeadragon viewer options, without options requiring a DOM element reference
 *
 * Viewer options may originate from a serialized project, which cannot carry DOM
 * element references. Options taking an element are therefore either narrowed to
 * an element ID or disallowed. In addition, `element` is omitted, as the viewer
 * sets it to its own container element (which takes precedence over
 * OpenSeadragon's `id` option), and `compositeOperation` is omitted, as viewer
 * options are applied to every tiled image in the world, which would overwrite
 * the composite operations that the renderers set per tiled image.
 */
export type OpenSeadragonViewerOptions = Omit<
  OpenSeadragon.Options,
  "element" | "compositeOperation"
> & {
  /** Unsupported, use `navigatorId` instead */
  navigatorElement?: never;

  /** Element ID of the toolbar container */
  toolbar?: string;

  /** Element ID of the zoom-in button */
  zoomInButton?: string;

  /** Element ID of the zoom-out button */
  zoomOutButton?: string;

  /** Element ID of the home (reset zoom) button */
  homeButton?: string;

  /** Element ID of the full-page toggle button */
  fullPageButton?: string;

  /** Element ID of the rotate-left button */
  rotateLeftButton?: string;

  /** Element ID of the rotate-right button */
  rotateRightButton?: string;

  /** Element ID of the previous-page button */
  previousButton?: string;

  /** Element ID of the next-page button */
  nextButton?: string;

  /** Unsupported */
  referenceStripElement?: never;
};

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
