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
  getSizeC(): number | undefined {
    return this.data.getSizeC();
  }

  getChannelNames(): string[] | undefined {
    return this.data.getChannelNames();
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    // caching is handled by renderers
    return this.data.getTileSource(c);
  }
}
