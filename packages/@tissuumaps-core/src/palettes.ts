import batlow from "./assets/palettes/batlow.txt?raw";
import batlowS from "./assets/palettes/batlowS.txt?raw";
import { type Color, Marker } from "./types";
import { ColorUtils } from "./utils";

export const markerPalette = [
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

export const continuousColorPalettes: Record<string, Color[]> = {
  batlow: ColorUtils.parseColorPalette(batlow),
};

export const categoricalColorPalettes: Record<string, Color[]> = {
  batlowS: ColorUtils.parseColorPalette(batlowS),
};

export const colorPalettes: Record<string, Color[]> = {
  ...continuousColorPalettes,
  ...categoricalColorPalettes,
};
