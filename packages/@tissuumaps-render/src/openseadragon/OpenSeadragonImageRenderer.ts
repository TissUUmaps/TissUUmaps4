import type {
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
      offset += renderedImage.tiledImageCount;
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
   * Computes the effective opacity for one of an image's tiled images
   *
   * Multiplies the layer and image opacity computed by the base class with the
   * visibility and opacity of the channel that the tiled image renders. Channels
   * are only applied to multi-channel image data, and channels that the image
   * does not define are visible at full opacity.
   *
   * @param ref - The image reference for which to compute the opacity
   * @param c - The index of the channel rendered by the tiled image
   * @returns The effective opacity for the channel's tiled image
   */
  protected override getOpacity(
    ref: ObjectRef<Image, ImageData>,
    c: number,
  ): number {
    let opacity = super.getOpacity(ref, c);
    if (
      opacity > 0 &&
      ref.data.getSizeC() !== undefined &&
      ref.object.channels !== undefined
    ) {
      const {
        visibility: channelVisibility = true,
        opacity: channelOpacity = 1.0,
      } = ref.object.channels[c] ?? {};
      opacity *= channelVisibility ? channelOpacity : 0;
    }
    return opacity;
  }
}
