// geotiff-tilesource ships no types; only the parts used here are declared
declare module "geotiff-tilesource" {
  import type { GeoTIFF, GeoTIFFImage, Pool } from "geotiff";
  import type OpenSeadragon from "openseadragon";

  import type { TypedArray } from "@tissuumaps/core";

  /**
   * A decoded tile, delivered to `tile-invalidated` handlers under the data
   * type `"tiffRaster"`. With `copyRasters: false` it is the plugin's cached
   * raster itself, not a copy, so it must not be modified.
   */
  export type TiffRaster = {
    /** The tile size of the level, also at the right and bottom edges */
    width: number;
    height: number;

    /** One array of samples per band, in band order, row-major */
    bands: TypedArray[];
  };

  export type GeoTIFFTileSourceClass = new (input: {
    GeoTIFF: GeoTIFF;
    GeoTIFFImages: GeoTIFFImage[];
  }) => OpenSeadragon.TileSource;

  /** What `enableGeoTIFFTileSource` adds to the OpenSeadragon namespace */
  export type GeoTIFFTileSourceNamespace = {
    GeoTIFFTileSource: GeoTIFFTileSourceClass;
  };

  export function enableGeoTIFFTileSource(
    openSeadragon: typeof OpenSeadragon,
    options?: {
      workerPool?: { enabled?: boolean };
      decoderPool?: Pool;
      copyRasters?: boolean;
    },
  ): void;
}
