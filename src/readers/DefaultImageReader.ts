import { TileSource } from "openseadragon";

import ImageReader, { ImageReaderOptions, TileSourceSpec } from "./ImageReader";

export const DEFAULT_IMAGE_READER_TYPE = "default";

export interface DefaultImageReaderOptions
  extends ImageReaderOptions<typeof DEFAULT_IMAGE_READER_TYPE> {
  tileSource: TileSourceSpec;
}

export default class DefaultImageReader implements ImageReader {
  private tileSource: TileSourceSpec;

  constructor(options: DefaultImageReaderOptions) {
    this.tileSource = options.tileSource;
  }

  getTileSource(): TileSource | TileSourceSpec {
    return structuredClone(this.tileSource);
  }
}
