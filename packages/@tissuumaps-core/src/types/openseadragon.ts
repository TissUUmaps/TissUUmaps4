import type OpenSeadragon from "openseadragon";

/** Configuration object accepted by OpenSeadragon as a tile source */
export type TileSourceConfig = object;

/** A custom tile source that resolves tile URLs programmatically */
export interface CustomTileSource {
  /**
   * Returns the URL for a specific tile
   *
   * @param level - Pyramid level
   * @param x - Tile column index
   * @param y - Tile row index
   * @returns The tile URL, or a function that returns the URL
   */
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}

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
