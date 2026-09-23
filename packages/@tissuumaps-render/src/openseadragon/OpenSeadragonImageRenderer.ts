import { deepEqual } from "fast-equals";

import {
  type Color,
  ColorUtils,
  type CustomTileSource,
  type Image,
  type ImageChannel,
  type ImageData,
  ImageUtils,
  MathUtils,
  type TileSourceConfig,
} from "@tissuumaps/core";

import type { DataTransfer } from "./OpenSeadragonContext";
import {
  type ObjectRef,
  OpenSeadragonRendererBase,
} from "./OpenSeadragonRendererBase";

export type OpenSeadragonImageSyncContext = {
  loadObject: (
    image: Image,
    options?: { signal?: AbortSignal },
  ) => Promise<ImageData>;
};

/**
 * Renderer for the tiled images of {@link Image} data objects
 *
 * Multi-channel image data provides one tiled image per channel, whose tiles
 * carry the channel's values rather than colors. Each channel is recolored by a
 * data transfer (see {@link OpenSeadragonContext.updateTiledImageDataTransfer})
 * that scales the values between the channel's contrast limits and multiplies
 * them with the channel's color. Color and contrast limits are taken from the
 * image's channel settings, falling back to those reported by the image data
 * (see {@link _getChannelColor} and {@link _getChannelContrastLimits}):
 * channels without a color use a default color for their channel index (see
 * {@link ImageUtils.getDefaultChannelColor}), or white for single-channel
 * image data, and channels without contrast limits use limits derived from
 * their histogram (see {@link ImageUtils.getDefaultContrastLimits}), if the
 * image data provides one, and the value range of their data type otherwise.
 * Channels whose data does not provide values are drawn as they are, as is
 * image data that is not multi-channel. Channel visibility and opacity are not
 * part of the transfer: like layer and image opacity, OpenSeadragon applies
 * them when drawing the tiled image (see {@link getTiledImageOpacity}).
 *
 * As data transfers are compared by identity, each channel's data transfer is
 * kept (see {@link resolveObject}) until the image's data or the channel's
 * color or contrast limits change, so that tiles are only recolored when
 * needed.
 */
export class OpenSeadragonImageRenderer extends OpenSeadragonRendererBase<
  Image,
  ImageData,
  OpenSeadragonImageSyncContext
> {
  private readonly _renderedMultichannelImages = new Map<
    string,
    {
      data: ImageData;
      channels: {
        state: Pick<ImageChannel, "color" | "contrastLimits">;
        dataTransfer: DataTransfer | undefined;
      }[];
    }
  >();

  /**
   * Returns the state of an image that a synchronization depends on
   *
   * Blanks out the name, visibility and opacity of every channel on top of
   * what the base class blanks out: they are applied from the current model
   * when updating the channel's tiled image (see {@link getTiledImageOpacity}),
   * whereas the channel colors and contrast limits build the data transfers
   * (see {@link resolveObject}) and stay part of the state.
   *
   * @param image - The image to return the state of
   * @returns The image without the properties that are applied by
   * {@link setModel}, and without the cosmetic ones
   */
  protected override getObjectSyncState(image: Image): object {
    return {
      ...super.getObjectSyncState(image),
      channels: image.channels?.map((channel) => ({
        ...channel,
        name: undefined,
        visibility: undefined,
        opacity: undefined,
      })),
    };
  }

  /**
   * Drops the data transfers of all images other than the given ones
   *
   * @param images - The images about to be displayed
   */
  protected override retainObjects(images: Image[]): void {
    for (const imageId of this._renderedMultichannelImages.keys()) {
      if (!images.some((image) => image.id === imageId)) {
        this._renderedMultichannelImages.delete(imageId);
      }
    }
  }

  /**
   * Resolves the data transfers of an image's channels, unless they are up to date
   *
   * Image data that is not multi-channel has no channels to resolve. Otherwise,
   * each channel's color and contrast limits are resolved from the image's
   * channel settings, falling back to those reported by the data (see
   * {@link _getChannelColor} and {@link _getChannelContrastLimits}), and its data
   * transfer is kept as long as the image's data and the resolved values are
   * unchanged, and is created anew otherwise (see {@link _createDataTransfer}).
   * Channels are resolved independently, so that changing one channel only
   * recolors the tiles of that channel.
   *
   * @param image - The image to resolve
   * @param data - The loaded data of the image
   * @returns A promise that resolves once the data transfers have been resolved
   */
  protected override resolveObject(
    image: Image,
    data: ImageData,
  ): Promise<void> {
    const sizeC = data.getSizeC();
    if (sizeC === undefined) {
      this._renderedMultichannelImages.delete(image.id);
      return Promise.resolve();
    }
    const renderedMultichannelImage = this._renderedMultichannelImages.get(
      image.id,
    );
    const channels = [];
    for (let index = 0; index < sizeC; index++) {
      const channel = image.channels?.[index];
      const renderedMultichannelImageChannel =
        renderedMultichannelImage?.channels[index];
      const newRenderedMultichannelImageChannelState = structuredClone({
        color: OpenSeadragonImageRenderer._getChannelColor(
          data,
          index,
          channel,
        ),
        contrastLimits: OpenSeadragonImageRenderer._getChannelContrastLimits(
          data,
          index,
          channel,
        ),
      });
      if (
        renderedMultichannelImage !== undefined &&
        renderedMultichannelImage.data === data &&
        renderedMultichannelImageChannel !== undefined &&
        deepEqual(
          renderedMultichannelImageChannel.state,
          newRenderedMultichannelImageChannelState,
        )
      ) {
        channels.push(renderedMultichannelImageChannel);
      } else {
        channels.push({
          state: newRenderedMultichannelImageChannelState,
          dataTransfer: OpenSeadragonImageRenderer._createDataTransfer(
            data,
            index,
            newRenderedMultichannelImageChannelState,
          ),
        });
      }
    }
    this._renderedMultichannelImages.set(image.id, { data, channels });
    return Promise.resolve();
  }

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
  protected override usesAdditiveBlending(data: ImageData): boolean {
    return data.getSizeC() !== undefined;
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
   * @param index - The index of the tiled image (channel), or `null` for the image's backdrop
   * @returns The effective opacity for the tiled image
   */
  protected override getTiledImageOpacity(
    ref: ObjectRef<Image, ImageData>,
    index: number | null,
  ): number {
    let alpha = super.getTiledImageOpacity(ref, index);
    if (alpha > 0 && index !== null && ref.data.getSizeC() !== undefined) {
      const channel = ref.object.channels?.[index];
      const channelVisibility =
        channel?.visibility ?? ref.data.getChannelVisibility?.(index) ?? true;
      const channelOpacity =
        channel?.opacity ?? ref.data.getChannelOpacity?.(index) ?? 1.0;
      alpha *= channelVisibility ? channelOpacity : 0;
    }
    return alpha;
  }

  /**
   * Returns the data transfer resolved for one of an image's tiled images
   *
   * Only the tiled images of an image's channels are recolored, never its
   * backdrop.
   *
   * @param ref - The image reference for which to get the data transfer
   * @param index - The index of the tiled image (channel), or `null` for the image's backdrop
   * @returns The channel's data transfer resolved by {@link resolveObject},
   * or `undefined` if the channel has none
   */
  protected override getTiledImageDataTransfer(
    ref: ObjectRef<Image, ImageData>,
    index: number | null,
  ): DataTransfer | undefined {
    if (index !== null) {
      const renderedMultichannelImage = this._renderedMultichannelImages.get(
        ref.object.id,
      );
      if (renderedMultichannelImage !== undefined) {
        const renderedMultichannelImageChannel =
          renderedMultichannelImage.channels[index];
        if (renderedMultichannelImageChannel !== undefined) {
          return renderedMultichannelImageChannel.dataTransfer;
        }
      }
    }
    return undefined;
  }

  /**
   * Creates the data transfer of an image channel
   *
   * The transfer scales each value linearly between the contrast limits,
   * clamped to `[0, 1]`, and multiplies the result with the channel's color, or
   * with the default color for the channel index (see
   * {@link ImageUtils.getDefaultChannelColor}) if the channel has none. Without
   * contrast limits, the value range of the data type of each tile's data is
   * used (see {@link ImageUtils.getDataTypeRange}); contrast limits that are not
   * ascending render every value black. The resulting pixels are opaque;
   * channel visibility and opacity are applied by OpenSeadragon when drawing
   * the tiled image.
   *
   * The scaled color is not computed per pixel: the transfer packs a ramp of
   * 256 colors once, with `ColorUtils.packColor` and `ColorUtils.withAlpha`,
   * and maps each value to the nearest ramp entry. As no color component
   * exceeds 255, the ramp holds every color the channel can take.
   *
   * @param data - The image data providing the channel's values
   * @param index - The index of the tiled image (channel)
   * @param channel - The color and contrast limits of the channel
   * @returns The data transfer, or `undefined` if the data provides no channel
   * values
   */
  private static _createDataTransfer(
    data: ImageData,
    index: number,
    channel: Pick<ImageChannel, "color" | "contrastLimits">,
  ): DataTransfer | undefined {
    if (data.getTileData !== undefined) {
      const { r, g, b } =
        channel.color ?? ImageUtils.getDefaultChannelColor(index);
      const ramp = new Uint32Array(256);
      for (let i = 0; i < ramp.length; i++) {
        const scale = i / (ramp.length - 1);
        ramp[i] = ColorUtils.withAlpha(
          ColorUtils.packColor({ r: r * scale, g: g * scale, b: b * scale }),
          1,
          255,
        );
      }
      return {
        getTileData: (event) => data.getTileData!(event),
        transferValues: (values, pixelBuffer) => {
          const [vmin, vmax] =
            channel.contrastLimits ?? ImageUtils.getDataTypeRange(values);
          const rampScale = vmax > vmin ? (ramp.length - 1) / (vmax - vmin) : 0;
          for (let i = 0; i < values.length; i++) {
            const value = values[i]!;
            const rampIndex = Math.round(
              MathUtils.clamp((value - vmin) * rampScale, 0, ramp.length - 1),
            );
            pixelBuffer[i] = ramp[rampIndex]!;
          }
        },
      };
    }
    return undefined;
  }

  /**
   * Resolves the color of an image channel
   *
   * The color configured on the image's channel wins over the color reported
   * by the image data. Single-channel image data without either is colorized
   * white, so that it renders as a grayscale image rather than in the red that
   * the index-based default would give its only channel. All other channels
   * without a color resolve to `undefined`, and are colorized with the default
   * color for their channel index by {@link _createDataTransfer} (see
   * {@link ImageUtils.getDefaultChannelColor}).
   *
   * @param data - The image data providing the channel
   * @param index - The index of the channel
   * @param channel - The image's settings for the channel, if any
   * @returns The resolved color, or `undefined` to use the index-based default
   */
  private static _getChannelColor(
    data: ImageData,
    index: number,
    channel: ImageChannel | undefined,
  ): Color | undefined {
    const userColor = channel?.color;
    if (userColor !== undefined) {
      return userColor;
    }
    const dataColor = data.getChannelColor?.(index);
    if (dataColor !== undefined) {
      return dataColor;
    }
    if (data.getSizeC() === 1) {
      return { r: 255, g: 255, b: 255 };
    }
    return undefined;
  }

  /**
   * Resolves the contrast limits of an image channel
   *
   * The contrast limits configured on the image's channel win over those
   * reported by the image data. Channels without either are stretched between
   * quantile-based limits derived from the channel's histogram, if the image
   * data provides one (see {@link ImageUtils.getDefaultContrastLimits}). All
   * other channels resolve to `undefined`, and are stretched over the value
   * range of each tile's data type by {@link _createDataTransfer} (see
   * {@link ImageUtils.getDataTypeRange}).
   *
   * @param data - The image data providing the channel
   * @param index - The index of the channel
   * @param channel - The image's settings for the channel, if any
   * @returns The resolved contrast limits, or `undefined` to use the data type
   * range
   */
  private static _getChannelContrastLimits(
    data: ImageData,
    index: number,
    channel: ImageChannel | undefined,
  ): [number, number] | undefined {
    const userContrastLimits = channel?.contrastLimits;
    if (userContrastLimits !== undefined) {
      return userContrastLimits;
    }
    const dataContrastLimits = data.getChannelContrastLimits?.(index);
    if (dataContrastLimits !== undefined) {
      return dataContrastLimits;
    }
    const histogram = data.getChannelHistogram?.(index);
    if (histogram !== undefined) {
      return ImageUtils.getDefaultContrastLimits(histogram);
    }
    return undefined;
  }
}
