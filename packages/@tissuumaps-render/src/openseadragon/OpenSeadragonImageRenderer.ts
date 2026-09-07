import type {
  Color,
  CustomTileSource,
  Image,
  ImageData,
  TileSourceConfig,
} from "@tissuumaps/core";

import {
  type ObjectRef,
  OpenSeadragonRendererBase,
  type OpenSeadragonSyncContext,
} from "./OpenSeadragonRendererBase";

export type OpenSeadragonImageSyncContext = OpenSeadragonSyncContext<
  Image,
  ImageData
>;

/**
 * Renderer for the tiled images of {@link Image} data objects
 */
export class OpenSeadragonImageRenderer extends OpenSeadragonRendererBase<
  Image,
  ImageData,
  OpenSeadragonImageSyncContext
> {
  /**
   * Returns the tile sources for the given image data
   *
   * Multi-channel image data provides one tile source per channel, in channel
   * order; all other image data provides a single tile source.
   *
   * @param data - The image data for which to retrieve the tile sources
   * @returns The tile sources, one per channel for multi-channel image data and
   * a single one otherwise
   */
  protected override getTileSources(
    data: ImageData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: OpenSeadragonImageSyncContext,
  ): (string | TileSourceConfig | CustomTileSource)[] {
    const tileSources: (string | TileSourceConfig | CustomTileSource)[] = [];
    const n = data.getSizeC();
    if (n !== undefined) {
      for (let c = 0; c < n; c++) {
        tileSources.push(data.getTileSource(c));
      }
    } else {
      tileSources.push(data.getTileSource());
    }
    return tileSources;
  }

  /**
   * Returns whether the channels of the given image data are blended additively
   *
   * Multi-channel image data blends additively, so that its channels add up
   * rather than hide one another. Image data that is not multi-channel has a
   * single tile source, so there is nothing to add up, and it keeps
   * OpenSeadragon's default compositing, which preserves the transparency of its
   * tiles.
   *
   * @param data - The image data to check
   * @returns Whether the image's channels are blended additively
   */
  protected override usesAdditiveBlending(
    data: ImageData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: OpenSeadragonImageSyncContext,
  ): boolean {
    return data.getSizeC() !== undefined;
  }

  /**
   * Returns the tint color for one of an image's tiled images
   *
   * Returns the color of the channel that the tiled image renders. Channels are
   * only applied to multi-channel image data, and channels that the image does
   * not define have no color, in which case the channel's tiles are rendered in
   * their own colors.
   *
   * Only multi-channel image data is tinted: its channels are blended additively
   * onto an opaque backdrop (see {@link usesAdditiveBlending}), where tinting a
   * tile may drop its transparency. Tiles of image data that is not
   * multi-channel are composited over whatever is below them, so their
   * transparency has to be preserved.
   *
   * @param ref - The image reference for which to compute the color
   * @param index - The index of the tiled image (channel), or `undefined` for the image's backdrop
   * @returns The channel's color, or `undefined` for no tint
   */
  protected override getTiledImageColor(
    ref: ObjectRef<Image, ImageData>,
    index: number | null,
    context: OpenSeadragonImageSyncContext,
  ): Color | undefined {
    if (index !== null && ref.data.getSizeC() !== undefined) {
      const channel = ref.object.channels?.[index];
      const channelColor =
        channel?.color !== undefined
          ? channel.color
          : ref.data.getChannelColor?.(index);
      return channelColor;
    }
    return super.getTiledImageColor(ref, index, context);
  }

  /**
   * Computes the effective opacity for one of an image's tiled images
   *
   * Multiplies the layer and image opacity computed by the base class with the
   * visibility and opacity of the channel that the tiled image renders. Channels
   * are only applied to multi-channel image data, and channels that the image
   * does not define are visible at full opacity. Without a channel index, i.e.
   * for the image's backdrop, the layer and image opacity is returned as is.
   *
   * @param ref - The image reference for which to compute the opacity
   * @param index - The index of the tiled image (channel), or `undefined` for the image's backdrop
   * @returns The effective opacity for the tiled image
   */
  protected override getTiledImageOpacity(
    ref: ObjectRef<Image, ImageData>,
    index: number | null,
    context: OpenSeadragonImageSyncContext,
  ): number {
    let alpha = super.getTiledImageOpacity(ref, index, context);
    if (alpha > 0 && index !== null && ref.data.getSizeC() !== undefined) {
      const channel = ref.object.channels?.[index];
      const channelVisibility =
        channel?.visibility !== undefined
          ? channel.visibility
          : (ref.data.getChannelVisibility?.(index) ?? true);
      const channelOpacity =
        channel?.opacity !== undefined
          ? channel.opacity
          : (ref.data.getChannelOpacity?.(index) ?? 1.0);

      alpha *= channelVisibility ? channelOpacity : 0;
    }
    return alpha;
  }
}
