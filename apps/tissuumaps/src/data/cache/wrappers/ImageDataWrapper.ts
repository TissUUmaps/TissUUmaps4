import type {
  Color,
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

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    // caching is handled by renderers
    return this.data.getTileSource(c);
  }

  getChannelName(c: number): string | undefined {
    return this.data.getChannelName?.(c);
  }

  getChannelVisibility(c: number): boolean | undefined {
    return this.data.getChannelVisibility?.(c);
  }

  getChannelOpacity(c: number): number | undefined {
    return this.data.getChannelOpacity?.(c);
  }

  getChannelColor(c: number): Color | undefined {
    return this.data.getChannelColor?.(c);
  }
}
