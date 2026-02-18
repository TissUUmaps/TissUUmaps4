import batlow from "./assets/palettes/batlow.txt?raw";
import batlowS from "./assets/palettes/batlowS.txt?raw";
import { type Color, Marker } from "./model/types";
import { ColorUtils } from "./utils/ColorUtils";

/** Default ordered palette of marker shapes used for categorical distinctions. */
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

/** A named color palette with a unique identifier and an ordered list of colors. */
export type ColorPalette = {
  /** Color palette ID */
  id: string;

  /** Human-readable display name for the color palette. */
  name: string;

  /** Ordered list of colors that make up the palette. */
  colors: Color[];
};

/** Color palettes suitable for continuous data. */
export const continuousColorPalettes: ColorPalette[] = [
  {
    id: "batlow",
    name: "Batlow (continuous)",
    colors: ColorUtils.parseColorPalette(batlow),
  },
];

/** Color palettes suitable for categorical data. */
export const categoricalColorPalettes: ColorPalette[] = [
  {
    id: "batlowS",
    name: "Batlow (categorical)",
    colors: ColorUtils.parseColorPalette(batlowS),
  },
];

/** All available color palettes (continuous and categorical combined). */
export const colorPalettes: ColorPalette[] = [
  ...continuousColorPalettes,
  ...categoricalColorPalettes,
];
