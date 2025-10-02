import batlow from "./assets/palettes/batlow.txt?raw";
import batlowS from "./assets/palettes/batlowS.txt?raw";
import { Color, Marker } from "./types";
import ColorUtils from "./utils/ColorUtils";

export const MARKER_PALETTE = [
  Marker.Cross,
  Marker.Diamond,
  Marker.Square,
  Marker.TriangleUp,
  Marker.Star,
  Marker.Clobber,
  Marker.Disc,
  Marker.HBar,
  Marker.VBar,
  Marker.TailedArrow,
  Marker.TriangleDown,
  Marker.Ring,
  Marker.X,
  Marker.Arrow,
  Marker.Gaussian,
];

export const CONTINUOUS_COLOR_PALETTES: Record<string, Color[]> = {
  batlow: ColorUtils.parseColorPalette(batlow),
};

export const CATEGORICAL_COLOR_PALETTES: Record<string, Color[]> = {
  batlowS: ColorUtils.parseColorPalette(batlowS),
};

export const COLOR_PALETTES: Record<string, Color[]> = {
  ...CONTINUOUS_COLOR_PALETTES,
  ...CATEGORICAL_COLOR_PALETTES,
};
