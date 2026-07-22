import type OpenSeadragon from "openseadragon";

export type OpenSeadragonOptions = {
  viewerOptions: OpenSeadragonViewerOptions;
  viewerAnimationStartOptions: OpenSeadragonViewerOptions;
  viewerAnimationFinishOptions: OpenSeadragonViewerOptions;
};

export type OpenSeadragonViewerOptions = Omit<
  OpenSeadragon.Options,
  "element"
> & {
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

  referenceStripElement?: never;
};
