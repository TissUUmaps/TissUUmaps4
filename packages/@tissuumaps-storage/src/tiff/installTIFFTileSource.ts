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
  poolSize: number;
};

let plugin: TIFFTileSourcePlugin | undefined;

/**
 * Installs the geotiff-tilesource plugin on first use
 *
 * @returns The tile source class, the decoder pool shared by all TIFF files,
 * and the number of workers in it
 */
export function installTIFFTileSource(): TIFFTileSourcePlugin {
  if (plugin === undefined) {
    // our own worker, so that the patched geotiff.js decoders are used off the
    // main thread too
    const poolSize = Math.min(navigator.hardwareConcurrency || 2, 4);
    const pool = new Pool(poolSize, () => new TIFFWorker());
    enableGeoTIFFTileSource(OpenSeadragon, {
      workerPool: { enabled: false }, // decodes rawTiff blobs, which we never request
      decoderPool: pool,
      copyRasters: false, // rasters are never mutated, so handlers get the cached one
    });
    const { GeoTIFFTileSource } =
      OpenSeadragon as unknown as GeoTIFFTileSourceNamespace;
    plugin = { GeoTIFFTileSource, pool, poolSize };
  }
  return plugin;
}
