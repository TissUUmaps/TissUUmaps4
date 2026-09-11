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

/** The continuous D3 color schemes offered as color palettes */
const continuousColorSchemes: [
  id: string,
  name: string,
  interpolate: (t: number) => string,
][] = [
  ["viridis", "Viridis", interpolateViridis],
  ["magma", "Magma", interpolateMagma],
  ["inferno", "Inferno", interpolateInferno],
  ["plasma", "Plasma", interpolatePlasma],
  ["cividis", "Cividis", interpolateCividis],
  ["turbo", "Turbo", interpolateTurbo],
  ["blues", "Blues", interpolateBlues],
  ["brbg", "BrBG", interpolateBrBG],
  ["bugn", "BuGn", interpolateBuGn],
  ["bupu", "BuPu", interpolateBuPu],
  ["cool", "Cool", interpolateCool],
  ["cubehelix", "Cubehelix", interpolateCubehelixDefault],
  ["gnbu", "GnBu", interpolateGnBu],
  ["greens", "Greens", interpolateGreens],
  ["greys", "Greys", interpolateGreys],
  ["oranges", "Oranges", interpolateOranges],
  ["orrd", "OrRd", interpolateOrRd],
  ["piyg", "PiYG", interpolatePiYG],
  ["prgn", "PRGn", interpolatePRGn],
  ["pubu", "PuBu", interpolatePuBu],
  ["pubugn", "PuBuGn", interpolatePuBuGn],
  ["puor", "PuOr", interpolatePuOr],
  ["purd", "PuRd", interpolatePuRd],
  ["purples", "Purples", interpolatePurples],
  ["rainbow", "Rainbow", interpolateRainbow],
  ["rdbu", "RdBu", interpolateRdBu],
  ["rdgy", "RdGy", interpolateRdGy],
  ["rdpu", "RdPu", interpolateRdPu],
  ["rdylbu", "RdYlBu", interpolateRdYlBu],
  ["rdylgn", "RdYlGn", interpolateRdYlGn],
  ["reds", "Reds", interpolateReds],
  ["sinebow", "Sinebow", interpolateSinebow],
  ["spectral", "Spectral", interpolateSpectral],
  ["warm", "Warm", interpolateWarm],
  ["ylgn", "YlGn", interpolateYlGn],
  ["ylgnbu", "YlGnBu", interpolateYlGnBu],
  ["ylorbr", "YlOrBr", interpolateYlOrBr],
  ["ylorrd", "YlOrRd", interpolateYlOrRd],
];

/** The categorical D3 color schemes offered as color palettes */
const categoricalColorSchemes: [
  id: string,
  name: string,
  hexColors: readonly string[],
][] = [
  ["category10", "Category 10", schemeCategory10],
  ["observable10", "Observable 10", schemeObservable10],
  ["tableau10", "Tableau 10", schemeTableau10],
  ["accent", "Accent", schemeAccent],
  ["dark2", "Dark 2", schemeDark2],
  ["paired", "Paired", schemePaired],
  ["pastel1", "Pastel 1", schemePastel1],
  ["pastel2", "Pastel 2", schemePastel2],
  ["set1", "Set 1", schemeSet1],
  ["set2", "Set 2", schemeSet2],
  ["set3", "Set 3", schemeSet3],
];

/** Color palettes suitable for continuous data */
export const continuousColorPalettes: ColorPalette[] = [
  {
    id: "batlow",
    name: "Batlow",
    colors: ColorUtils.parseColorPalette(batlow),
  },
  ...continuousColorSchemes.map(([id, name, interpolate]) => ({
    id,
    name,
    colors: ColorUtils.sampleColorPalette(
      interpolate,
      continuousColorPaletteSize,
    ),
  })),
];

/** Color palettes suitable for categorical data */
export const categoricalColorPalettes: ColorPalette[] = [
  {
    id: "batlowS",
    name: "Batlow",
    colors: ColorUtils.parseColorPalette(batlowS),
  },
  ...categoricalColorSchemes.map(([id, name, hexColors]) => ({
    id,
    name,
    colors: hexColors.map((hex) => ColorUtils.fromHex(hex)),
  })),
];

/** All available color palettes, continuous and categorical */
export const colorPalettes: ColorPalette[] = [
  ...continuousColorPalettes,
  ...categoricalColorPalettes,
];
