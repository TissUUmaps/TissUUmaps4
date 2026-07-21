import { deepEqual } from "fast-equals";
import { mat3 } from "gl-matrix";
import OpenSeadragon from "openseadragon";

import {
  type CustomTileSource,
  GeometryUtils,
  type Image,
  type ImageData,
  type Labels,
  type LabelsData,
  type Layer,
  type Rect,
  type TileSourceConfig,
  TransformUtils,
} from "@tissuumaps/core";

import type { OpenSeadragonContext } from "./OpenSeadragonContext";

/**
 * Base class for OpenSeadragon renderers that manage tiled images for objects (images or labels)
 */
export abstract class OpenSeadragonRendererBase<
  TObject extends Image | Labels,
  TObjectData extends ImageData | LabelsData,
> {
  private static _defaultBounds = { x: 0, y: 0, width: 1, height: 1 };

  readonly context: OpenSeadragonContext;
  protected renderedObjects: RenderedObject<TObject, TObjectData>[] = [];
  private _anchor: OpenSeadragon.TiledImage | undefined;
  private _extraBounds: Rect[] = [];

  /**
   * Creates a new OpenSeadragonRendererBase instance
   *
   * @param context - The OpenSeadragon context that provides access to the viewer and other shared state
   */
  constructor(
    context: OpenSeadragonContext,
    onInitialized: () => void,
    onError: (error: Error) => void,
    options?: { anchorIndex?: number; signal?: AbortSignal },
  ) {
    this.context = context;
    const { anchorIndex, signal } = options ?? {};
    const initialize = async () => {
      signal?.throwIfAborted();
      this._anchor = await this.context.updateBounds(
        OpenSeadragonRendererBase._defaultBounds,
        { dummyIndex: anchorIndex },
      );
      signal?.throwIfAborted();
    };
    initialize().then(onInitialized, onError);
  }

  setExtraBounds(bounds: Rect[]): void {
    this._extraBounds = bounds;
  }

  async updateBounds(options?: { signal?: AbortSignal }): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tiledImageBounds = [];
    for (const renderedObject of this.renderedObjects) {
      if (renderedObject.tiledImage !== undefined) {
        tiledImageBounds.push(renderedObject.tiledImage.getBounds());
      }
    }
    const bounds =
      GeometryUtils.boundingBox(...tiledImageBounds, ...this._extraBounds) ??
      OpenSeadragonRendererBase._defaultBounds;
    this._anchor = await this.context.updateBounds(bounds, {
      dummy: this._anchor,
    });
    signal?.throwIfAborted();
  }

  /**
   * Destroys the renderer by removing the anchor tiled image and all rendered objects from the OpenSeadragon viewer
   */
  async destroy(): Promise<void> {
    if (this._anchor !== undefined) {
      await this.context.removeTiledImage(this._anchor);
      this._anchor = undefined;
    }
    for (const renderedObject of this.renderedObjects) {
      await this.deleteRenderedObject(renderedObject);
    }
    this.renderedObjects = [];
  }

  /**
   * Loads the data for all objects in the specified layers and returns a list of object references
   *
   * @param layers - The layers for which to load objects
   * @param objects - The objects to load (images or labels)
   * @param loadObject - A function that retrieves the (cached) data for a given object ID
   * @param options - Optional parameters, including an AbortSignal to cancel the operation
   * @returns A promise that resolves to a list of object references containing the loaded data
   */
  protected async loadObjects(
    layers: Layer[],
    objects: TObject[],
    loadObject: (
      objectId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TObjectData>,
    options?: { signal?: AbortSignal },
  ) {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefs: ObjectRef<TObject, TObjectData>[] = [];
    for (const currentLayer of layers) {
      for (const currentObject of objects.filter(
        (object) => object.layer === currentLayer.id,
      )) {
        let data;
        try {
          data = await loadObject(currentObject.id, { signal });
        } catch (error) {
          if (!signal?.aborted) {
            console.error(
              `Failed to load object with ID '${currentObject.id}'`,
              error,
            );
          }
          continue;
        } finally {
          signal?.throwIfAborted();
        }
        newRefs.push({ layer: currentLayer, object: currentObject, data });
      }
    }
    return newRefs;
  }

  /**
   * Cleans up the rendered objects by removing any that are no longer referenced in the new list of object references.
   *
   * @param newRefs - The new list of object references that should be retained
   * @returns A map of the new object references to their corresponding rendered objects that are still valid
   */
  protected async cleanRenderedObjects(
    newRefs: ObjectRef<TObject, TObjectData>[],
    options?: { signal?: AbortSignal },
  ): Promise<
    Map<ObjectRef<TObject, TObjectData>, RenderedObject<TObject, TObjectData>>
  > {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    if (this._anchor === undefined) {
      throw new Error("Anchor not initialized");
    }
    const anchorIndex = await this.context.getTiledImageIndex(this._anchor);
    signal?.throwIfAborted();
    if (anchorIndex === -1) {
      throw new Error("Anchor not found");
    }
    const renderedObjectsByNewRef = new Map<
      ObjectRef<TObject, TObjectData>,
      RenderedObject<TObject, TObjectData>
    >();
    const survivors = new Set<RenderedObject<TObject, TObjectData>>();
    let nextIndex = anchorIndex + 1;
    for (const newRef of newRefs) {
      const renderedObject = this.renderedObjects.find(
        (renderedObject) =>
          renderedObject.ref.layer.id === newRef.layer.id &&
          renderedObject.ref.object.id === newRef.object.id &&
          deepEqual(
            renderedObject.state.object.dataSource,
            newRef.object.dataSource,
          ),
      );
      if (renderedObject !== undefined) {
        if (renderedObject.tiledImage !== undefined) {
          const index = await this.context.getTiledImageIndex(
            renderedObject.tiledImage,
          );
          signal?.throwIfAborted();
          if (index === nextIndex) {
            renderedObjectsByNewRef.set(newRef, renderedObject);
            survivors.add(renderedObject);
          }
        }
        nextIndex++;
      }
    }
    for (const renderedObject of this.renderedObjects) {
      if (!survivors.has(renderedObject)) {
        await this.deleteRenderedObject(renderedObject, { signal });
        signal?.throwIfAborted();
      }
    }
    this.renderedObjects = [...survivors];
    return renderedObjectsByNewRef;
  }

  /**
   * Creates a new rendered object for the given object reference and adds it to the OpenSeadragon viewer.
   *
   * The TiledImage is created asynchronously; the rendered object will be updated once the TiledImage is available.
   * If the rendered object is deleted before the TiledImage is created, it will be removed from the viewer immediately after creation.
   * Otherwise, the rendered object will be updated with the current state of the object reference and the TiledImage will be added to the viewer.
   *
   * @param newRef - The object reference for which to create a rendered object
   * @returns The newly created rendered object, which may not yet have a TiledImage
   */
  protected createRenderedObject(
    newRef: ObjectRef<TObject, TObjectData>,
    options?: { signal?: AbortSignal },
  ): RenderedObject<TObject, TObjectData> {
    const { signal } = options ?? {};
    const newRenderedObject: RenderedObject<TObject, TObjectData> = {
      ref: newRef,
      state: {
        object: { dataSource: structuredClone(newRef.object.dataSource) },
      },
      tiledImagePromise: this.context
        .addTiledImage({ tileSource: this.getTileSource(newRef.data) })
        .then(async (tiledImage) => {
          signal?.throwIfAborted();
          if (!this.context.isDestroyed()) {
            if (newRenderedObject.pendingDelete) {
              await this.context.removeTiledImage(tiledImage);
              signal?.throwIfAborted();
            } else {
              newRenderedObject.tiledImage = tiledImage;
              this.updateRenderedObject(newRenderedObject);
              await this.updateBounds({ signal });
              signal?.throwIfAborted();
            }
          }
          return tiledImage;
        }),
    };
    return newRenderedObject;
  }

  /**
   * Updates the rendered object with the current state of the object reference and the TiledImage.
   *
   * @param renderedObject - The rendered object to update
   * @param newRef - The new object reference to update the rendered object with. If not provided, the existing reference will be used.
   * @throws Error if the TiledImage has not been created yet
   */
  protected updateRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
    newRef: ObjectRef<TObject, TObjectData> = renderedObject.ref,
  ): void {
    if (renderedObject.tiledImage === undefined) {
      throw new Error("Rendered object not loaded");
    }
    renderedObject.ref = newRef;
    // transform --> flip, width, rotation, position
    const bounds = renderedObject.tiledImage.getBounds();
    const transform = OpenSeadragonRendererBase.getTransform(
      newRef,
      renderedObject.tiledImage.getContentSize(),
    );
    if (renderedObject.tiledImage.getFlip() !== transform.flip) {
      renderedObject.tiledImage.setFlip(transform.flip);
    }
    if (bounds.width !== transform.width) {
      renderedObject.tiledImage.setWidth(transform.width, true); // implicitly updates height to maintain aspect ratio
    }
    if (renderedObject.tiledImage.getRotation() !== transform.rotation) {
      renderedObject.tiledImage.setRotation(transform.rotation, true);
    }
    if (
      bounds.x !== transform.position.x ||
      bounds.y !== transform.position.y
    ) {
      renderedObject.tiledImage.setPosition(transform.position, true);
    }
    // visibility & opacity --> opacity
    const oldOpacity = renderedObject.tiledImage.getOpacity();
    const newOpacity = OpenSeadragonRendererBase.getOpacity(newRef);
    if (oldOpacity !== newOpacity) {
      renderedObject.tiledImage.setOpacity(newOpacity);
      if (oldOpacity === 0 && newOpacity > 0) {
        // OpenSeadragon does not load tiles for invisible images,
        // so we need to trigger a reload when an image becomes visible
        renderedObject.tiledImage.update(true);
      }
    }
    renderedObject.state = {
      object: {
        dataSource: structuredClone(newRef.object.dataSource),
      },
    };
  }

  /**
   * Deletes the rendered object by removing its TiledImage from the OpenSeadragon viewer, or marking it for deletion if the TiledImage has not yet been created.
   *
   * @param renderedObject - The rendered object to delete
   */
  protected async deleteRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    if (renderedObject.tiledImage !== undefined) {
      await this.context.removeTiledImage(renderedObject.tiledImage);
      signal?.throwIfAborted();
    } else {
      renderedObject.pendingDelete = true;
    }
  }

  /**
   * Abstract method to retrieve the tile source for a given object data.
   *
   * @param data - The object data (image or labels) for which to retrieve the tile source.
   * @returns The tile source, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object.
   */
  protected abstract getTileSource(
    data: TObjectData,
  ): string | TileSourceConfig | CustomTileSource;

  /**
   * Computes the effective opacity for a tiled image
   *
   * Returns `0` when either the layer or object is invisible; otherwise
   * multiplies layer and object opacities.
   *
   * @param ref - The object reference for which to compute the opacity
   * @returns The effective opacity for the tiled image
   */
  protected static getOpacity<
    TObject extends Image | Labels,
    TObjectData extends ImageData | LabelsData,
  >(ref: ObjectRef<TObject, TObjectData>): number {
    const visibility = ref.layer.visibility && ref.object.visibility;
    const opacity = ref.layer.opacity * ref.object.opacity;
    return visibility ? opacity : 0;
  }

  /**
   * Computes the effective flip, width, rotation, and position for a tiled image based on the object reference and its content size.
   *
   * The transformation is computed by combining the object's transform with the layer's transform, and then applying the content size to determine the final width and position.
   *
   * @param ref - The object reference for which to compute the transformation
   * @param contentSize - The size of the content (image or labels) in pixels
   * @returns An object containing the computed flip, width, rotation, and position for the tiled image
   */
  protected static getTransform<
    TObject extends Image | Labels,
    TObjectData extends ImageData | LabelsData,
  >(
    ref: ObjectRef<TObject, TObjectData>,
    contentSize: { x: number; y: number },
  ): {
    flip: boolean;
    width: number;
    rotation: number;
    position: OpenSeadragon.Point;
  } {
    const m = mat3.create();
    const dataToLayerMatrix = TransformUtils.toSimilarityMatrix(
      ref.object.transform,
      { center: { x: contentSize.x / 2, y: contentSize.y / 2 } },
    );
    mat3.multiply(m, dataToLayerMatrix, m);
    const layerToWorldMatrix = TransformUtils.toSimilarityMatrix(
      ref.layer.transform,
    );
    mat3.multiply(m, layerToWorldMatrix, m);
    const transform = TransformUtils.fromSimilarityMatrix(m);
    return {
      flip: ref.object.flip,
      width: contentSize.x * transform.scale,
      rotation: transform.rotation,
      position: new OpenSeadragon.Point(
        transform.translation.x,
        transform.translation.y,
      ),
    };
  }
}

/**
 * A reference to either an image or labels object on a specific layer
 *
 * @template TObject - The type of the object (Image or Labels)
 * @template TObjectData - The type of the object data (ImageData or LabelsData)
 */
export type ObjectRef<
  TObject extends Image | Labels,
  TObjectData extends ImageData | LabelsData,
> = {
  layer: Layer;
  object: TObject;
  data: TObjectData;
};

/**
 * Mutable state for a single tiled image in the viewer
 *
 * Because OpenSeadragon adds tiled images asynchronously, the `tiledImage`
 * field may be `undefined` until the `success` callback fires. During that
 * window, deletions are deferred via `pendingDelete`.
 */
export type RenderedObject<
  TObject extends Image | Labels,
  TObjectData extends ImageData | LabelsData,
> = {
  ref: ObjectRef<TObject, TObjectData>;
  state: { object: Pick<TObject, "dataSource"> };
  tiledImagePromise: Promise<OpenSeadragon.TiledImage>;
  tiledImage?: OpenSeadragon.TiledImage;
  pendingDelete?: boolean;
};
