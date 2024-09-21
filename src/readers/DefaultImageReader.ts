import {
  ImageReader,
  ImageReaderOptions,
  TileSourceSpec,
} from "../model/image";

export const DEFAULT_IMAGE_READER_TYPE = "default";

export interface DefaultImageReaderOptions
  extends ImageReaderOptions<typeof DEFAULT_IMAGE_READER_TYPE> {
  tileSource: string | TileSourceSpec;
}

export default class DefaultImageReader implements ImageReader {
  private tileSource: string | TileSourceSpec;

  constructor(options: DefaultImageReaderOptions) {
    this.tileSource = options.tileSource;
  }

  getTileSource(): string | TileSourceSpec {
    return structuredClone(this.tileSource);
  }
}
