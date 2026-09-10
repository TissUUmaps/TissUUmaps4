// geotiff-tilesource ships no types; only the parts used here are declared
declare module "geotiff-tilesource" {
  import type { GeoTIFF, GeoTIFFImage, Pool } from "geotiff";
  import type OpenSeadragon from "openseadragon";

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
