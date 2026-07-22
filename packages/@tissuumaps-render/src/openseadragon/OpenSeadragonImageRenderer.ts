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
 * Renderer for managing tiled images for {@link Image} data objects in an OpenSeadragon viewer.
 *
 * This class extends the {@link OpenSeadragonRendererBase} to provide specific functionality for rendering image objects.
 * It handles the synchronization of tiled images with the current model state, including loading, updating, and removing images as needed.
 */
export class OpenSeadragonImageRenderer extends OpenSeadragonRendererBase<
  Image,
  ImageData
> {
  /**
   * Synchronizes the viewer's tiled images with the current model state for image objects.
   *
   * This method loads all image objects that are assigned to the given layers, removes tiled images that are no longer needed, and creates or updates the remaining ones.
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
      imageId: string,
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
    for (const newRef of newRefs) {
      const renderedImage = renderedImagesByNewRef.get(newRef);
      if (renderedImage === undefined) {
        const newRenderedImage = this.createRenderedObject(newRef, { signal });
        newRenderedImages.push(newRenderedImage);
      } else {
        this.updateRenderedObject(renderedImage, newRef);
        newRenderedImages.push(renderedImage);
      }
    }
    this.renderedObjects = newRenderedImages;
    await this.updateBounds({ signal });
  }

  /**
   * Retrieves the tile source for a given image data object.
   *
   * This method is called by the renderer to obtain the appropriate tile source for each image data object, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object.
   *
   * @param data - The image data object for which to retrieve the tile source.
   * @returns The tile source, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object.
   */
  protected getTileSource(
    data: ImageData,
  ): string | TileSourceConfig | CustomTileSource {
    return data.getTileSource();
  }
}
