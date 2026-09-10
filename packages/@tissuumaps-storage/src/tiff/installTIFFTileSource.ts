import { Pool } from "geotiff";
import {
  type GeoTIFFTileSourceClass,
  type GeoTIFFTileSourceNamespace,
  enableGeoTIFFTileSource,
} from "geotiff-tilesource";
import OpenSeadragon from "openseadragon";

import TIFFWorker from "./tiff.worker?worker&inline";

/** The OpenSeadragon data type of the plugin's tiles */
export const tiffRasterType = "tiffRaster";

type TIFFTileSourcePlugin = {
  GeoTIFFTileSource: GeoTIFFTileSourceClass;
  pool: Pool;
};

let plugin: TIFFTileSourcePlugin | undefined;

/**
 * Installs the geotiff-tilesource plugin on first use
 *
 * @returns The tile source class and the decoder pool shared by all TIFF files
 */
export function installTIFFTileSource(): TIFFTileSourcePlugin {
  if (plugin === undefined) {
    // our own worker, so that the patched geotiff.js decoders are used off the
    // main thread too
    const pool = new Pool(
      Math.min(navigator.hardwareConcurrency || 2, 4),
      () => new TIFFWorker(),
    );
    enableGeoTIFFTileSource(OpenSeadragon, {
      workerPool: { enabled: false }, // decodes rawTiff blobs, which we never request
      decoderPool: pool,
      copyRasters: false, // rasters are never mutated, so handlers get the cached one
    });
    const { GeoTIFFTileSource } =
      OpenSeadragon as unknown as GeoTIFFTileSourceNamespace;
    plugin = { GeoTIFFTileSource, pool };
  }
  return plugin;
}
