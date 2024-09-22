import { TileSource } from "openseadragon";

import ImageReader, { ImageReaderOptions, TileSourceSpec } from "./ImageReader";

export const TILE_SOURCE_IMAGE_READER_TYPE = "tileSource";

export interface TileSourceImageReaderOptions
  extends ImageReaderOptions<typeof TILE_SOURCE_IMAGE_READER_TYPE> {
  tileSource: TileSourceSpec;
}

export default class TileSourceImageReader implements ImageReader {
  private tileSource: TileSourceSpec;

  constructor(options: TileSourceImageReaderOptions) {
    this.tileSource = options.tileSource;
  }

  getTileSource(): TileSource | TileSourceSpec {
    return structuredClone(this.tileSource);
  }
}
