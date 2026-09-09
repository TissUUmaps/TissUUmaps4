import { deepEqual } from "fast-equals";

import {
  type Channel,
  ColorUtils,
  type CustomTileSource,
  type Image,
  type ImageData,
  MathUtils,
  type NumericArray,
  type TileSourceConfig,
  defaultChannelColor,
} from "@tissuumaps/core";

import type { DataTransfer } from "./OpenSeadragonContext";
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
 *
 * Multi-channel image data provides one tiled image per channel, whose tiles
 * carry the channel's values rather than colors. Each channel is recolored by a
 * data transfer (see {@link OpenSeadragonContext.updateTiledImageDataTransfer})
 * that scales the values between the channel's contrast limits and multiplies
 * them with the channel's color. Color and contrast limits are taken from the
 * image's channel settings, falling back to those reported by the image data;
 * channels with neither are drawn as they are, as are channels whose data does
 * not provide values, and image data that is not multi-channel. Channel
 * visibility and opacity are not part of the transfer: like layer and image
 * opacity, OpenSeadragon applies them when drawing the tiled image (see
 * {@link getTiledImageOpacity}).
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
  private readonly _renderedImages = new Map<
    string,
    {
      data: ImageData;
      channels: {
        state: Pick<Channel, "color" | "contrastLimits">;
        dataTransfer: DataTransfer | undefined;
      }[];
    }
  >();

  /**
   * Drops the data transfers of all images other than the given ones
   *
   * @param images - The images about to be displayed
   */
  protected override retainObjects(images: Image[]): void {
    for (const imageId of this._renderedImages.keys()) {
      if (!images.some((image) => image.id === imageId)) {
        this._renderedImages.delete(imageId);
      }
    }
  }

  /**
   * Resolves the data transfers of an image's channels, unless they are up to date
   *
   * Image data that is not multi-channel has no channels to resolve. Otherwise,
   * each channel's color and contrast limits are resolved from the image's
   * channel settings, falling back to those reported by the data, and its data
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
      this._renderedImages.delete(image.id);
      return Promise.resolve();
    }
    const renderedImage = this._renderedImages.get(image.id);
    const renderedImageChannels = [];
    for (let c = 0; c < sizeC; c++) {
      const renderedImageChannel = renderedImage?.channels[c];
      const renderedImageChannelState = structuredClone({
        color: image.channels?.[c]?.color ?? data.getChannelColor?.(c),
        contrastLimits:
          image.channels?.[c]?.contrastLimits ??
          data.getChannelContrastLimits?.(c),
      });
      if (
        renderedImage !== undefined &&
        renderedImage.data === data &&
        renderedImageChannel !== undefined &&
        deepEqual(renderedImageChannel.state, renderedImageChannelState)
      ) {
        renderedImageChannels.push(renderedImageChannel);
      } else {
        renderedImageChannels.push({
          state: renderedImageChannelState,
          dataTransfer: OpenSeadragonImageRenderer._createDataTransfer(
            data,
            c,
            renderedImageChannelState,
          ),
        });
      }
    }
    this._renderedImages.set(image.id, {
      data,
      channels: renderedImageChannels,
    });
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
      const renderedImage = this._renderedImages.get(ref.object.id);
      if (renderedImage !== undefined) {
        const renderedImageChannel = renderedImage.channels[index];
        if (renderedImageChannel !== undefined) {
          return renderedImageChannel.dataTransfer;
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
   * with {@link defaultChannelColor} if the channel has none. Without contrast
   * limits, the value range of the data type of each tile's data is used (see
   * {@link _getDataTypeRange}); contrast limits that are not ascending render
   * every value black. The resulting pixels are opaque; channel visibility and
   * opacity are applied by OpenSeadragon when drawing the tiled image.
   *
   * The scaled color is not computed per pixel: the transfer packs a ramp of
   * 256 colors once, with `ColorUtils.packColor` and `ColorUtils.packRGBA`,
   * and maps each value to the nearest ramp entry. As no color component
   * exceeds 255, the ramp holds every color the channel can take.
   *
   * @param data - The image data providing the channel's values
   * @param index - The index of the tiled image (channel)
   * @param state - The resolved color and contrast limits of the channel
   * @returns The data transfer, or `undefined` if the channel has neither a
   * color nor contrast limits, or if the data provides no channel values
   */
  private static _createDataTransfer(
    data: ImageData,
    index: number,
    state: Pick<Channel, "color" | "contrastLimits">,
  ): DataTransfer | undefined {
    if (
      data.getChannelData !== undefined &&
      (state.color !== undefined || state.contrastLimits !== undefined)
    ) {
      const {
        r: channelR,
        g: channelG,
        b: channelB,
      } = state.color ?? defaultChannelColor;
      const ramp = new Uint32Array(256);
      for (let i = 0; i < ramp.length; i++) {
        const scale = i / (ramp.length - 1);
        ramp[i] = ColorUtils.packRGBA(
          ColorUtils.packColor({
            r: channelR * scale,
            g: channelG * scale,
            b: channelB * scale,
          }),
          1,
          255,
        );
      }
      return {
        getData: (event) => data.getChannelData!(index, event),
        transfer: (values, pixelBuffer) => {
          const [vmin, vmax] =
            state.contrastLimits ??
            OpenSeadragonImageRenderer._getDataTypeRange(values);
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
   * Returns the value range that the type of the given array can hold
   *
   * Integer typed arrays span their full integer range, floating-point typed
   * arrays are taken to hold normalized values in `[0, 1]`, and plain arrays
   * are taken to hold 8-bit values.
   *
   * @param values - The array whose value range to return
   * @returns The value range, as `[min, max]`
   */
  private static _getDataTypeRange(values: NumericArray): [number, number] {
    if (values instanceof Uint8Array) {
      return [0, 255];
    }
    if (values instanceof Uint16Array) {
      return [0, 65535];
    }
    if (values instanceof Uint32Array) {
      return [0, 4294967295];
    }
    if (values instanceof Int8Array) {
      return [-128, 127];
    }
    if (values instanceof Int16Array) {
      return [-32768, 32767];
    }
    if (values instanceof Int32Array) {
      return [-2147483648, 2147483647];
    }
    if (Array.isArray(values)) {
      return [0, 255];
    }
    return [0, 1];
  }
}
