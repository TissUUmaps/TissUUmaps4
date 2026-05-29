import {
  type Color,
  type CoordinateSpace,
  Marker,
  type RenderOptions,
  type Transform,
  type ViewerOptions,
} from "./types";

/** Identity similarity transform */
export const identityTransform = {
  flip: false,
  scale: 1,
  rotation: 0,
  translation: { x: 0, y: 0 },
} as const satisfies Transform;

/** Default OpenSeadragon viewer options */
export const defaultViewerOptions = {
  minZoomImageRatio: 0,
  maxZoomPixelRatio: Infinity,
  preserveImageSizeOnResize: true,
  visibilityRatio: 0,
  animationTime: 0,
  gestureSettingsMouse: {
    flickEnabled: false,
  },
  gestureSettingsTouch: {
    flickEnabled: false,
  },
  gestureSettingsPen: {
    flickEnabled: false,
  },
  gestureSettingsUnknown: {
    flickEnabled: false,
  },
  zoomPerClick: 1,
  showNavigator: true,
  navigatorPosition: "BOTTOM_LEFT",
  maxImageCacheCount: 2000,
  showNavigationControl: false,
  imageSmoothingEnabled: false,
} as const satisfies ViewerOptions;

/** Default WebGL render options */
export const defaultRenderOptions = {
  pointSizeFactor: 1,
  shapeStrokeWidth: 1,
  numShapesScanlines: 512,
} as const satisfies RenderOptions;

// TODO always use defaultLabelColorPalette instead
/** Default label color */
export const defaultLabelColor = {
  r: 255,
  g: 255,
  b: 255,
} as const satisfies Color;

/** ID of the default color palette for random label colors */
export const defaultLabelColorPalette: string = "batlowS";

/** Default label visibility */
export const defaultLabelVisibility = true;

/** Default label opacity */
export const defaultLabelOpacity = 1;

/** Default point marker */
export const defaultPointMarker = Marker.Disc;

/** Default point size */
export const defaultPointSize = 1;

/** Default point size unit ({@link CoordinateSpace} — sizes are in data/pixel space by default) */
export const defaultPointSizeUnit: CoordinateSpace = "data";

/** Default point color */
export const defaultPointColor = {
  r: 255,
  g: 255,
  b: 255,
} as const satisfies Color;

/** Default point visibility */
export const defaultPointVisibility = true;

/** Default point opacity */
export const defaultPointOpacity = 1;

/** Default shape fill color */
export const defaultShapeFillColor = {
  r: 255,
  g: 255,
  b: 255,
} as const satisfies Color;

/** Default shape fill visibility */
export const defaultShapeFillVisibility = true;

/** Default shape fill opacity */
export const defaultShapeFillOpacity = 1;

/** Default shape stroke color */
export const defaultShapeStrokeColor = {
  r: 0,
  g: 0,
  b: 0,
} as const satisfies Color;

/** Default shape stroke visibility */
export const defaultShapeStrokeVisibility = true;

/** Default shape stroke opacity */
export const defaultShapeStrokeOpacity = 1;
