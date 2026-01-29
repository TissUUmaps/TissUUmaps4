import batlow from "./assets/palettes/batlow.txt?raw";
import batlowS from "./assets/palettes/batlowS.txt?raw";
import { type Color, Marker } from "./model/types";
import { ColorUtils } from "./utils/ColorUtils";

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

export type ColorPalette = {
  id: string;
  name: string;
  colors: Color[];
};

export const continuousColorPalettes: ColorPalette[] = [
  {
    id: "batlow",
    name: "Batlow (continuous)",
    colors: ColorUtils.parseColorPalette(batlow),
  },
];

export const categoricalColorPalettes: ColorPalette[] = [
  {
    id: "batlowS",
    name: "Batlow (categorical)",
    colors: ColorUtils.parseColorPalette(batlowS),
  },
];

export const colorPalettes: ColorPalette[] = [
  ...continuousColorPalettes,
  ...categoricalColorPalettes,
];
