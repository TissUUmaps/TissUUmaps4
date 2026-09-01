import type {
  Color,
  CustomTileSource,
  Image,
  ImageData,
  Layer,
  TileSourceConfig,
} from "@tissuumaps/core";

import {
  type ObjectRef,
  OpenSeadragonRendererBase,
  type RenderedObject,
} from "./OpenSeadragonRendererBase";

/**
 * Renderer for the tiled images of {@link Image} data objects
 */
export class OpenSeadragonImageRenderer extends OpenSeadragonRendererBase<
  Image,
  ImageData
> {
  /**
   * Synchronizes the viewer's tiled images with the current model state
   *
   * Loads all image objects assigned to the given layers, removes the tiled
   * images that are no longer needed, and creates or updates the remaining ones.
   * Resolves once the tiled images have actually been added to the world, i.e.
   * once the viewer reflects the given model state.
   *
   * Images whose tiled images cannot be created, e.g. because their data
   * provides no tile sources, are logged and skipped, just like images whose
   * data failed to load (see {@link loadObjects}).
   *
   * @param layers - Layers to render
   * @param images - Image objects to display
   * @param loadImage - Async getter for image data
   * @param options - Optional abort signal
   */
  async synchronize(
    layers: Layer[],
    images: Image[],
    loadImage: (
      image: Image,
      options?: { signal?: AbortSignal },
    ) => Promise<ImageData>,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefs: ObjectRef<Image, ImageData>[] = await this.loadObjects(
      layers,
      images,
      loadImage,
      { signal },
    );
    let offset = 0;
    const newRenderedImages: RenderedObject<Image, ImageData>[] = [];
    const renderedImagesByNewRef = await this.cleanRenderedObjects(newRefs, {
      signal,
    });
    for (const newRef of newRefs) {
      let renderedImage = renderedImagesByNewRef.get(newRef);
      if (renderedImage === undefined) {
        try {
          renderedImage = this.createRenderedObject(offset, newRef, { signal });
        } catch (error) {
          console.error(
            `Failed to create tiled images for object with ID '${newRef.object.id}'`,
            error,
          );
          continue;
        }
      } else {
        this.updateRenderedObject(renderedImage, newRef);
      }
      newRenderedImages.push(renderedImage);
      const useBackdrop = this.usesAdditiveBlending(renderedImage.ref.data);
      offset += (useBackdrop ? 1 : 0) + renderedImage.tileSourceCount;
    }
    this.renderedObjects = newRenderedImages;
    await Promise.allSettled(
      newRenderedImages.map(
        (renderedImage) => renderedImage.tiledImagesPromise,
      ),
    );
    signal?.throwIfAborted(); // Promise.allSettled() does not throw on abort
    await this.updateBounds({ signal });
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
  protected getTileSources(
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
   * @param c - The index of the channel rendered by the tiled image
   * @returns The channel's color, or `undefined` for no tint
   */
  protected override getTiledImageColor(
    ref: ObjectRef<Image, ImageData>,
    c: number,
  ): Color | undefined {
    if (
      ref.data.getSizeC() !== undefined &&
      ref.object.channels !== undefined
    ) {
      const channel = ref.object.channels[c];
      const channelColor =
        channel?.color !== undefined
          ? channel.color
          : ref.data.getChannelColor?.(c);
      return channelColor;
    }
    return super.getTiledImageColor(ref, c);
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
   * @param c - The index of the channel rendered by the tiled image, or
   * `undefined` for the image's backdrop
   * @returns The effective opacity for the tiled image
   */
  protected override getTiledImageOpacity(
    ref: ObjectRef<Image, ImageData>,
    c?: number,
  ): number {
    let opacity = super.getTiledImageOpacity(ref, c);
    if (
      opacity > 0 &&
      c !== undefined &&
      ref.data.getSizeC() !== undefined &&
      ref.object.channels !== undefined
    ) {
      const channel = ref.object.channels[c];
      const channelVisibility =
        channel?.visibility !== undefined
          ? channel.visibility
          : (ref.data.getChannelVisibility?.(c) ?? true);
      const channelOpacity =
        channel?.opacity !== undefined
          ? channel.opacity
          : (ref.data.getChannelOpacity?.(c) ?? 1.0);

      opacity *= channelVisibility ? channelOpacity : 0;
    }
    return opacity;
  }
}
