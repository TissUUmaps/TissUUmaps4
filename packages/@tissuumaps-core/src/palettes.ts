import batlow from "./assets/palettes/batlow.txt?raw";
import batlowS from "./assets/palettes/batlowS.txt?raw";
import { type Color, Marker } from "./model/primitives";
import { ColorUtils } from "./utils/ColorUtils";

/** Ordered palette of marker shapes, for distinguishing categorical groups */
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

/** A named, identifiable list of colors */
export type ColorPalette = {
  /** Color palette ID */
  id: string;

  /** Human-readable color palette name */
  name: string;

  /** The colors making up the palette, in order */
  colors: Color[];
};

/** Color palettes suitable for continuous data */
export const continuousColorPalettes: ColorPalette[] = [
  {
    id: "batlow",
    name: "Batlow (continuous)",
    colors: ColorUtils.parseColorPalette(batlow),
  },
];

/** Color palettes suitable for categorical data */
export const categoricalColorPalettes: ColorPalette[] = [
  {
    id: "batlowS",
    name: "Batlow (categorical)",
    colors: ColorUtils.parseColorPalette(batlowS),
  },
];

/** All available color palettes, continuous and categorical */
export const colorPalettes: ColorPalette[] = [
  ...continuousColorPalettes,
  ...categoricalColorPalettes,
];
