import type OpenSeadragon from "openseadragon";

/** OpenSeadragon viewer options */
export type ViewerOptions = Omit<OpenSeadragon.Options, "element"> & {
  // References to DOM elements cannot be handled by Zustand!
  navigatorElement?: never;
  toolbar?: string;
  zoomInButton?: string;
  zoomOutButton?: string;
  homeButton?: string;
  fullPageButton?: string;
  rotateLeftButton?: string;
  rotateRightButton?: string;
  previousButton?: string;
  nextButton?: string;
  referenceStripElement?: never;
};

/** WebGL draw options */
export type DrawOptions = {
  /** Point size factor */
  pointSizeFactor: number;

  /** Shape stroke width */
  shapeStrokeWidth: number;

  /** Number of scanlines per shapes object */
  numShapesScanlines: number;
};
