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
    const newRenderedImages: RenderedObject<Image, ImageData>[] = [];
    const renderedImagesByNewRef = await this.cleanRenderedObjects(newRefs, {
      signal,
    });
    for (let offset = 0; offset < newRefs.length; offset++) {
      const newRef = newRefs[offset]!;
      const renderedImage = renderedImagesByNewRef.get(newRef);
      if (renderedImage === undefined) {
        const newRenderedImage = this.createRenderedObject(offset, newRef, {
          signal,
        });
        newRenderedImages.push(newRenderedImage);
      } else {
        this.updateRenderedObject(renderedImage, newRef);
        newRenderedImages.push(renderedImage);
      }
    }
    this.renderedObjects = newRenderedImages;
    await Promise.allSettled(
      newRenderedImages.map((renderedImage) => renderedImage.tiledImagePromise),
    );
    signal?.throwIfAborted(); // Promise.allSettled() does not throw on abort
    await this.updateBounds({ signal });
  }

  /**
   * Returns the tile source for the given image data
   */
  protected getTileSource(
    data: ImageData,
  ): string | TileSourceConfig | CustomTileSource {
    return data.getTileSource();
  }
}
