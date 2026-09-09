import {
  type Color,
  type CoordinateSpace,
  Marker,
  type SimilarityTransform,
} from "./primitives";

/** Identity similarity transform */
export const identityTransform = {
  flip: false,
  scale: 1,
  rotation: 0,
  translation: { x: 0, y: 0 },
} as const satisfies SimilarityTransform;

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

/** Default coordinate space in which point sizes are specified */
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
