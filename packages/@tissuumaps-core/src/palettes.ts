import {
  interpolateBlues,
  interpolateBrBG,
  interpolateBuGn,
  interpolateBuPu,
  interpolateCividis,
  interpolateCool,
  interpolateCubehelixDefault,
  interpolateGnBu,
  interpolateGreens,
  interpolateGreys,
  interpolateInferno,
  interpolateMagma,
  interpolateOrRd,
  interpolateOranges,
  interpolatePRGn,
  interpolatePiYG,
  interpolatePlasma,
  interpolatePuBu,
  interpolatePuBuGn,
  interpolatePuOr,
  interpolatePuRd,
  interpolatePurples,
  interpolateRainbow,
  interpolateRdBu,
  interpolateRdGy,
  interpolateRdPu,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateReds,
  interpolateSinebow,
  interpolateSpectral,
  interpolateTurbo,
  interpolateViridis,
  interpolateWarm,
  interpolateYlGn,
  interpolateYlGnBu,
  interpolateYlOrBr,
  interpolateYlOrRd,
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemeObservable10,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
} from "d3-scale-chromatic";

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

/** Number of colors sampled from each continuous D3 color scheme */
const continuousColorPaletteSize = 256;

/** Builds a color palette by sampling a continuous D3 color scheme */
function sampledColorPalette(
  id: string,
  name: string,
  interpolate: (t: number) => string,
): ColorPalette {
  return {
    id,
    name,
    colors: ColorUtils.sampleColorPalette(
      interpolate,
      continuousColorPaletteSize,
    ),
  };
}

/** Builds a color palette from a list of hex colors */
function hexColorPalette(
  id: string,
  name: string,
  hexColors: readonly string[],
): ColorPalette {
  return { id, name, colors: hexColors.map((hex) => ColorUtils.fromHex(hex)) };
}

/** Color palettes suitable for continuous data */
export const continuousColorPalettes: ColorPalette[] = [
  {
    id: "batlow",
    name: "Batlow",
    colors: ColorUtils.parsePalette(batlow),
  },
  sampledColorPalette("viridis", "Viridis", interpolateViridis),
  sampledColorPalette("magma", "Magma", interpolateMagma),
  sampledColorPalette("inferno", "Inferno", interpolateInferno),
  sampledColorPalette("plasma", "Plasma", interpolatePlasma),
  sampledColorPalette("cividis", "Cividis", interpolateCividis),
  sampledColorPalette("turbo", "Turbo", interpolateTurbo),
  sampledColorPalette("blues", "Blues", interpolateBlues),
  sampledColorPalette("brbg", "BrBG", interpolateBrBG),
  sampledColorPalette("bugn", "BuGn", interpolateBuGn),
  sampledColorPalette("bupu", "BuPu", interpolateBuPu),
  sampledColorPalette("cool", "Cool", interpolateCool),
  sampledColorPalette("cubehelix", "Cubehelix", interpolateCubehelixDefault),
  sampledColorPalette("gnbu", "GnBu", interpolateGnBu),
  sampledColorPalette("greens", "Greens", interpolateGreens),
  sampledColorPalette("greys", "Greys", interpolateGreys),
  sampledColorPalette("oranges", "Oranges", interpolateOranges),
  sampledColorPalette("orrd", "OrRd", interpolateOrRd),
  sampledColorPalette("piyg", "PiYG", interpolatePiYG),
  sampledColorPalette("prgn", "PRGn", interpolatePRGn),
  sampledColorPalette("pubu", "PuBu", interpolatePuBu),
  sampledColorPalette("pubugn", "PuBuGn", interpolatePuBuGn),
  sampledColorPalette("puor", "PuOr", interpolatePuOr),
  sampledColorPalette("purd", "PuRd", interpolatePuRd),
  sampledColorPalette("purples", "Purples", interpolatePurples),
  sampledColorPalette("rainbow", "Rainbow", interpolateRainbow),
  sampledColorPalette("rdbu", "RdBu", interpolateRdBu),
  sampledColorPalette("rdgy", "RdGy", interpolateRdGy),
  sampledColorPalette("rdpu", "RdPu", interpolateRdPu),
  sampledColorPalette("rdylbu", "RdYlBu", interpolateRdYlBu),
  sampledColorPalette("rdylgn", "RdYlGn", interpolateRdYlGn),
  sampledColorPalette("reds", "Reds", interpolateReds),
  sampledColorPalette("sinebow", "Sinebow", interpolateSinebow),
  sampledColorPalette("spectral", "Spectral", interpolateSpectral),
  sampledColorPalette("warm", "Warm", interpolateWarm),
  sampledColorPalette("ylgn", "YlGn", interpolateYlGn),
  sampledColorPalette("ylgnbu", "YlGnBu", interpolateYlGnBu),
  sampledColorPalette("ylorbr", "YlOrBr", interpolateYlOrBr),
  sampledColorPalette("ylorrd", "YlOrRd", interpolateYlOrRd),
];

/** Color palettes suitable for categorical data */
export const categoricalColorPalettes: ColorPalette[] = [
  {
    id: "batlowS",
    name: "Batlow",
    colors: ColorUtils.parsePalette(batlowS),
  },
  hexColorPalette("category10", "Category 10", schemeCategory10),
  hexColorPalette("observable10", "Observable 10", schemeObservable10),
  hexColorPalette("tableau10", "Tableau 10", schemeTableau10),
  hexColorPalette("accent", "Accent", schemeAccent),
  hexColorPalette("dark2", "Dark 2", schemeDark2),
  hexColorPalette("paired", "Paired", schemePaired),
  hexColorPalette("pastel1", "Pastel 1", schemePastel1),
  hexColorPalette("pastel2", "Pastel 2", schemePastel2),
  hexColorPalette("set1", "Set 1", schemeSet1),
  hexColorPalette("set2", "Set 2", schemeSet2),
  hexColorPalette("set3", "Set 3", schemeSet3),
];

/** All available color palettes, continuous and categorical */
export const colorPalettes: ColorPalette[] = [
  ...continuousColorPalettes,
  ...categoricalColorPalettes,
];
