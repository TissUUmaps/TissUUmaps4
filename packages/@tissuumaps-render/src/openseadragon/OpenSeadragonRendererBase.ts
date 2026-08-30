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
 *
 * Each renderer owns an anchor, an invisible tiled image spanning everything the
 * renderer contributes to the world (see
 * {@link OpenSeadragonContext.updateBounds}). Renderers share a viewer, so the
 * anchor also marks where the renderer's own tiled images belong: they directly
 * follow the anchor, in the order of {@link renderedObjects}.
 *
 * Tiled images are inserted behind the anchor when they are added, rather than
 * moved there afterwards, as OpenSeadragon's navigator cannot keep up with
 * reordering. {@link cleanRenderedObjects} recreates those that are out of place.
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
  private _anchorTaskPromise: Promise<unknown> = Promise.resolve();
  private _destroyed: boolean = false;

  /**
   * Creates a new OpenSeadragonRendererBase instance and asynchronously adds its anchor
   *
   * The renderer must not be used before `onInitialized` has been called;
   * `onError` is called instead if adding the anchor failed or was aborted.
   *
   * @param context - The OpenSeadragon context that provides access to the viewer and other shared state
   * @param onInitialized - Called once the anchor has been added to the world
   * @param onError - Called if the anchor could not be added
   * @param options - Optional abort signal and world index at which to insert the anchor
   */
  constructor(
    context: OpenSeadragonContext,
    onInitialized: () => void,
    onError: (error: Error) => void,
    options?: { signal?: AbortSignal; anchorIndex?: number },
  ) {
    this.context = context;
    this._enqueueAnchorTask(async () => {
      const { signal, anchorIndex } = options ?? {};
      signal?.throwIfAborted();
      this._anchor = await this.context.updateBounds(
        OpenSeadragonRendererBase._defaultBounds,
        { signal, dummyIndex: anchorIndex },
      );
    }).then(onInitialized, onError);
  }

  /**
   * Sets additional bounds to be covered by the anchor
   *
   * Used to include content that is not rendered by OpenSeadragon (e.g. points
   * and shapes rendered with WebGL) in the viewer's world bounds. Takes effect on
   * the next {@link updateBounds} call.
   *
   * @param bounds - Additional bounds, in world coordinates
   */
  setExtraBounds(bounds: Rect[]): void {
    this._extraBounds = bounds;
  }

  /**
   * Resizes the anchor to the bounding box of all tiled images and extra bounds
   *
   * Rendered objects whose tiled image has not been added to the world yet are
   * ignored; they update the anchor themselves upon arrival (see
   * {@link createRenderedObject}). Does nothing once the renderer has been
   * destroyed, as there is no anchor to resize anymore.
   *
   * @param options - Optional abort signal
   */
  updateBounds(options?: { signal?: AbortSignal }): Promise<void> {
    if (this._destroyed) {
      return Promise.resolve();
    }
    return this._enqueueAnchorTask(async () => {
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
        signal,
        dummy: this._anchor,
      });
    });
  }

  /**
   * Destroys the renderer by removing the anchor tiled image and all rendered objects from the OpenSeadragon viewer
   *
   * Rendered objects whose tiled image has not been added to the world yet are
   * only marked for deletion, and are removed as soon as they arrive.
   *
   * The renderer is unusable afterwards: it has no anchor anymore, so
   * {@link updateBounds} does nothing, {@link cleanRenderedObjects} throws, and
   * tiled images that still arrive are removed right away.
   */
  async destroy(): Promise<void> {
    this._destroyed = true;
    for (const renderedObject of this.renderedObjects) {
      await this.deleteRenderedObject(renderedObject);
    }
    this.renderedObjects = [];
    // remove the anchor once all pending anchor tasks have settled, as they
    // would otherwise re-create it
    await this._enqueueAnchorTask(async () => {
      if (this._anchor !== undefined) {
        const anchor = this._anchor;
        this._anchor = undefined;
        await this.context.removeTiledImage(anchor);
      }
    });
  }

  /**
   * Concurrently loads the data of all objects assigned to the specified layers
   *
   * The returned references are ordered by layer and then by object, which
   * determines the order of the corresponding tiled images in the world. Objects
   * whose data failed to load are logged and skipped.
   *
   * @param layers - The layers for which to load objects
   * @param objects - The objects to load (images or labels), filtered by layer membership
   * @param loadObject - A function that retrieves the (cached) data for a given object
   * @param options - Optional abort signal
   * @returns A promise that resolves to one object reference per successfully loaded object
   */
  protected async loadObjects(
    layers: Layer[],
    objects: TObject[],
    loadObject: (
      object: TObject,
      options?: { signal?: AbortSignal },
    ) => Promise<TObjectData>,
    options?: { signal?: AbortSignal },
  ): Promise<ObjectRef<TObject, TObjectData>[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefPromises: Promise<ObjectRef<TObject, TObjectData>>[] = [];
    for (const currentLayer of layers) {
      for (const currentObject of objects.filter(
        (object) => object.layer === currentLayer.id,
      )) {
        const dataPromise = loadObject(currentObject, { signal });
        dataPromise.catch((error) => {
          if (!signal?.aborted) {
            console.error(
              `Failed to load object with ID '${currentObject.id}'`,
              error,
            );
          }
        });
        const newRefPromise = dataPromise.then((data) => ({
          layer: currentLayer,
          object: currentObject,
          data,
        }));
        newRefPromises.push(newRefPromise);
      }
    }
    const results = await Promise.allSettled(newRefPromises);
    signal?.throwIfAborted();
    return results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
  }

  /**
   * Retains the rendered objects that can be reused for the new object references, and deletes the rest
   *
   * A rendered object is reusable if it references the same object on the same
   * layer with an unchanged data source, and if its tiled image already sits at
   * the world index expected for its position among the reusable references,
   * counted from the anchor. All other rendered objects are deleted, and are
   * expected to be recreated by the caller via {@link createRenderedObject},
   * which is also how the world is reordered.
   *
   * @param newRefs - The new object references, in the intended world order
   * @param options - Optional abort signal
   * @returns A map of new object references to their reusable rendered objects
   * @throws Error if the renderer has no anchor, i.e. it is not initialized or
   * already destroyed
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
    const anchorIndex = this.context.getTiledImageIndex(this._anchor);
    if (anchorIndex === -1) {
      throw new Error("Anchor not found");
    }
    const renderedObjectsByNewRef = new Map<
      ObjectRef<TObject, TObjectData>,
      RenderedObject<TObject, TObjectData>
    >();
    const survivors = new Set<RenderedObject<TObject, TObjectData>>();
    let nextOffset = 1;
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
        if (
          renderedObject.tiledImage !== undefined &&
          this.context.getTiledImageIndex(renderedObject.tiledImage) ===
            anchorIndex + nextOffset
        ) {
          renderedObjectsByNewRef.set(newRef, renderedObject);
          survivors.add(renderedObject);
        }
        nextOffset++;
      }
    }
    for (const renderedObject of this.renderedObjects) {
      if (!survivors.has(renderedObject)) {
        await this.deleteRenderedObject(renderedObject);
        signal?.throwIfAborted();
      }
    }
    this.renderedObjects = [...survivors];
    return renderedObjectsByNewRef;
  }

  /**
   * Creates a new rendered object for the given object reference and adds its TiledImage to the world
   *
   * The TiledImage is inserted `offset` places after the anchor, which
   * establishes the world layout that {@link cleanRenderedObjects} expects. Its
   * index is resolved once the addition is executed, as the anchor may have been
   * replaced, and world indices may have shifted, while it was enqueued.
   *
   * Returns before the TiledImage exists: it is added asynchronously and only
   * then assigned to the rendered object, transformed, and included in the
   * anchor bounds. If the rendered object is deleted or the operation is aborted
   * in the meantime, the TiledImage is removed again immediately after it was
   * added; if the context is destroyed, nothing is done at all.
   *
   * @param offset - The position after the anchor at which to insert the new TiledImage
   * @param newRef - The object reference for which to create a rendered object
   * @param options - Optional abort signal
   * @returns The newly created rendered object, which does not have a TiledImage yet
   */
  protected createRenderedObject(
    offset: number,
    newRef: ObjectRef<TObject, TObjectData>,
    options?: { signal?: AbortSignal },
  ): RenderedObject<TObject, TObjectData> {
    const { signal } = options ?? {};
    const {
      promise: tiledImagePromise,
      resolve: resolveTiledImagePromise,
      reject: rejectTiledImagePromise,
    } = Promise.withResolvers<OpenSeadragon.TiledImage>();
    tiledImagePromise.catch(() => {}); // prevent unhandled rejections in console
    const newRenderedObject: RenderedObject<TObject, TObjectData> = {
      ref: newRef,
      state: {
        object: { dataSource: structuredClone(newRef.object.dataSource) },
      },
      tiledImagePromise,
    };
    this.context
      .addTiledImage(
        { tileSource: this.getTileSource(newRef.data) },
        {
          signal,
          getIndex: () => {
            if (this._anchor !== undefined) {
              const anchorIndex = this.context.getTiledImageIndex(this._anchor);
              if (anchorIndex !== -1) {
                return anchorIndex + 1 + offset;
              }
            }
            return undefined;
          },
        },
      )
      .then(async (tiledImage) => {
        signal?.throwIfAborted();
        if (!this.context.isDestroyed()) {
          if (
            newRenderedObject.pendingDelete ||
            signal?.aborted ||
            this._destroyed
          ) {
            await this.context.removeTiledImage(tiledImage);
            signal?.throwIfAborted();
          } else {
            newRenderedObject.tiledImage = tiledImage;
            this.updateRenderedObject(newRenderedObject);
            await this.updateBounds({ signal });
          }
        }
        return tiledImage;
      })
      .then(resolveTiledImagePromise, rejectTiledImagePromise);
    return newRenderedObject;
  }

  /**
   * Applies the transform, flip, visibility, and opacity of an object reference to the rendered object's TiledImage
   *
   * Only properties whose value actually changed are written, as each write
   * triggers a redraw. The applied data source is recorded in the rendered
   * object's state, where {@link cleanRenderedObjects} picks it up to detect
   * TiledImages that have to be recreated.
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
   * Deletes the rendered object by removing its TiledImage from the OpenSeadragon viewer, or marking it for deletion if the TiledImage has not yet been created
   *
   * The removal is queued by the context (see
   * {@link OpenSeadragonContext.removeTiledImage}) and applied before any tiled
   * image requested after it, so a caller that deletes before it creates still
   * gets the world indices it expects.
   *
   * Deleting a rendered object does not remove it from {@link renderedObjects}.
   *
   * @param renderedObject - The rendered object to delete
   * @param options - Optional abort signal
   */
  protected deleteRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
  ): Promise<void> {
    if (renderedObject.tiledImage === undefined) {
      renderedObject.pendingDelete = true;
      return Promise.resolve();
    }
    return this.context.removeTiledImage(renderedObject.tiledImage);
  }

  /**
   * Returns the tile source for the given object data
   *
   * @param data - The object data (image or labels) for which to retrieve the tile source
   * @returns The tile source, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object
   */
  protected abstract getTileSource(
    data: TObjectData,
  ): string | TileSourceConfig | CustomTileSource;

  /**
   * Appends a task to the anchor task queue
   *
   * Tasks are run one at a time, in call order, and a failing task does not
   * prevent subsequent tasks from running. Every task that reads or writes
   * {@link _anchor} has to be enqueued here: concurrent tasks would each replace
   * the anchor they captured, leaving the anchors created in between orphaned in
   * the world, which shifts all subsequent world indices and thereby invalidates
   * the layout expected by {@link cleanRenderedObjects}.
   *
   * The queue is per renderer, and separate from the context's addition queue,
   * which anchor tasks enqueue onto themselves.
   *
   * @param task - Task to run once all previously enqueued tasks have settled
   * @returns A promise that resolves with the task's result
   */
  private _enqueueAnchorTask<T>(task: () => T | Promise<T>): Promise<T> {
    const result = this._anchorTaskPromise.then(task);
    this._anchorTaskPromise = result.catch(() => {}); // prevent unhandled rejections in console
    return result;
  }

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
   * Computes the effective flip, width, rotation, and position for a tiled image based on the object reference and its content size
   *
   * Composes the object's data-to-layer transform with the layer's layer-to-world
   * transform and decomposes the result into the components expected by
   * OpenSeadragon: a width in world coordinates, a rotation, and the position of
   * the unrotated top-left corner. The object transform rotates around the
   * object's center, matching OpenSeadragon, which rotates tiled images around
   * their center. The flip is passed through, as OpenSeadragon applies it itself.
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
