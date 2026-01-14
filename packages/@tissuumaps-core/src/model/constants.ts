import { colorPalettes } from "../palettes";
import {
  type Color,
  type CoordinateSpace,
  type DrawOptions,
  Marker,
  type SimilarityTransform,
  type ViewerOptions,
} from "./types";

/** Identity similarity transform */
export const identityTransform = {
  scale: 1,
  rotation: 0,
  translation: { x: 0, y: 0 },
} as const satisfies SimilarityTransform;

/** Default size unit */
export const defaultSizeUnit: CoordinateSpace = "data";

/** Default WebGL draw options */
export const defaultDrawOptions = {
  pointSizeFactor: 1,
  shapeStrokeWidth: 1,
  numShapesScanlines: 512,
} as const satisfies DrawOptions;

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

/** Default palette for random label colors */
export const defaultRandomLabelColorPalette: keyof typeof colorPalettes =
  "batlowS";

/** Default label visibility */
export const defaultLabelVisibility = true;

/** Default label opacity */
export const defaultLabelOpacity = 1;

/** Default point marker */
export const defaultPointMarker = Marker.Disc;

/** Default point size */
export const defaultPointSize = 1;

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
