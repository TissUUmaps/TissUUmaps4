import type {
  CustomTileSource,
  ImageData,
  TileSourceConfig,
} from "@tissuumaps/core";

import { DataWrapperBase } from "./DataWrapperBase";

/**
 * Cache wrapper around image data, delegating to the wrapped data
 */
export class ImageDataWrapper
  extends DataWrapperBase<ImageData>
  implements ImageData
{
  getTileSource(): string | TileSourceConfig | CustomTileSource {
    // caching is handled by renderers
    return this.data.getTileSource();
  }
}
