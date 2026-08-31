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
 * follow the anchor, in the order of {@link renderedObjects}, with one tiled
 * image per channel of each object.
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
   * Rendered objects whose tiled images have not been added to the world yet are
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
        if (renderedObject.tiledImages !== undefined) {
          for (const tiledImage of renderedObject.tiledImages) {
            tiledImageBounds.push(tiledImage.getBounds());
          }
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
   * Rendered objects whose tiled images have not been added to the world yet are
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
   * layer with an unchanged data source, and if all of its tiled images already
   * sit at the consecutive world indices expected for its position among the
   * reusable references, counted from the anchor. A partially misplaced object
   * is not reusable. All other rendered objects are deleted, and are expected to
   * be recreated by the caller via {@link createRenderedObject}, which is also
   * how the world is reordered.
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
    let offset = 1;
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
          renderedObject.tiledImages !== undefined &&
          renderedObject.tiledImages.every(
            (tiledImage, c) =>
              this.context.getTiledImageIndex(tiledImage) ===
              anchorIndex + offset + c,
          )
        ) {
          renderedObjectsByNewRef.set(newRef, renderedObject);
          survivors.add(renderedObject);
        }
        offset += renderedObject.tiledImageCount;
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
   * Creates a new rendered object for the given object reference and adds one TiledImage per channel to the world
   *
   * The TiledImages are inserted at consecutive indices, starting `offset` places
   * after the anchor, which establishes the world layout that
   * {@link cleanRenderedObjects} expects. `offset` therefore counts TiledImages,
   * not objects, and callers have to advance it by
   * {@link RenderedObject.tiledImageCount}. The indices are resolved once each
   * addition is executed, as the anchor may have been replaced, and world indices
   * may have shifted, while it was enqueued.
   *
   * Returns before the TiledImages exist: they are added asynchronously and only
   * then assigned to the rendered object, transformed, and included in the anchor
   * bounds, which is when {@link RenderedObject.tiledImagesPromise} resolves. The
   * TiledImages are removed again immediately after they were added if the
   * rendered object is deleted or the operation is aborted in the meantime, or if
   * any of them could not be added at all - a partially added object would shift
   * the world indices of every object after it. If the context is destroyed,
   * nothing is done at all, as the viewer tears down its world itself.
   *
   * @param offset - The number of TiledImages between the anchor and the first new TiledImage
   * @param newRef - The object reference for which to create a rendered object
   * @param options - Optional abort signal
   * @returns The newly created rendered object, which does not have TiledImages yet
   * @throws Error if the object data provides no tile sources
   */
  protected createRenderedObject(
    offset: number,
    newRef: ObjectRef<TObject, TObjectData>,
    options?: { signal?: AbortSignal },
  ): RenderedObject<TObject, TObjectData> {
    const { signal } = options ?? {};
    const tileSources = this.getTileSources(newRef.data);
    if (tileSources.length === 0) {
      throw new Error(
        `Object with ID '${newRef.object.id}' has no tile sources`,
      );
    }
    const {
      promise: tiledImagesPromise,
      resolve: resolveTiledImagesPromise,
      reject: rejectTiledImagesPromise,
    } = Promise.withResolvers<OpenSeadragon.TiledImage[]>();
    tiledImagesPromise.catch(() => {}); // prevent unhandled rejections in console
    const newRenderedObject: RenderedObject<TObject, TObjectData> = {
      ref: newRef,
      state: {
        object: { dataSource: structuredClone(newRef.object.dataSource) },
      },
      tiledImageCount: tileSources.length,
      tiledImagesPromise,
    };
    const tiledImagePromises: Promise<OpenSeadragon.TiledImage>[] = [];
    for (let c = 0; c < tileSources.length; c++) {
      const tiledImagePromise = this.context.addTiledImage(
        { tileSource: tileSources[c]! },
        {
          signal,
          getIndex: () => {
            if (this._anchor !== undefined) {
              const anchorIndex = this.context.getTiledImageIndex(this._anchor);
              if (anchorIndex !== -1) {
                return anchorIndex + 1 + offset + c;
              }
            }
            return undefined;
          },
        },
      );
      tiledImagePromise.catch(() => {}); // prevent unhandled rejections in console
      tiledImagePromises.push(tiledImagePromise);
    }
    Promise.allSettled(tiledImagePromises)
      .then(async (results) => {
        const tiledImages = results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);
        if (this.context.isDestroyed()) {
          return tiledImages; // the viewer tears down its world itself
        }
        const failure = results.find((result) => result.status === "rejected");
        if (
          signal?.aborted ||
          failure !== undefined ||
          newRenderedObject.pendingDelete ||
          this._destroyed
        ) {
          for (const tiledImage of tiledImages) {
            await this.context.removeTiledImage(tiledImage);
          }
          signal?.throwIfAborted();
          if (failure !== undefined) {
            console.error(
              `Failed to add ${results.length - tiledImages.length} of ${results.length} tiled images for object with ID '${newRef.object.id}'`,
              failure.reason,
            );
            throw new Error("Failed to add tiled images", {
              cause: failure.reason,
            });
          }
        } else {
          newRenderedObject.tiledImages = tiledImages;
          this.updateRenderedObject(newRenderedObject);
          await this.updateBounds({ signal });
        }
        return tiledImages;
      })
      .then(resolveTiledImagesPromise, rejectTiledImagesPromise);
    return newRenderedObject;
  }

  /**
   * Applies the transform, flip, visibility, and opacity of an object reference to each of the rendered object's TiledImages
   *
   * Only properties whose value actually changed are written, as each write
   * triggers a redraw. The opacity is computed per TiledImage via
   * {@link getOpacity}, so that subclasses can vary it by channel; all other
   * properties are shared by all TiledImages of an object. The applied data
   * source is recorded in the rendered object's state, where
   * {@link cleanRenderedObjects} picks it up to detect TiledImages that have to
   * be recreated.
   *
   * @param renderedObject - The rendered object to update
   * @param newRef - The new object reference to update the rendered object with. If not provided, the existing reference will be used.
   * @throws Error if the TiledImages have not been created yet
   */
  protected updateRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
    newRef: ObjectRef<TObject, TObjectData> = renderedObject.ref,
  ): void {
    if (renderedObject.tiledImages === undefined) {
      throw new Error("Rendered object not loaded");
    }
    renderedObject.ref = newRef;
    for (let c = 0; c < renderedObject.tiledImages.length; c++) {
      const tiledImage = renderedObject.tiledImages[c]!;
      // transform --> flip, width, rotation, position
      const bounds = tiledImage.getBounds();
      const transform = OpenSeadragonRendererBase.getTransform(
        newRef,
        tiledImage.getContentSize(),
      );
      if (tiledImage.getFlip() !== transform.flip) {
        tiledImage.setFlip(transform.flip);
      }
      if (bounds.width !== transform.width) {
        tiledImage.setWidth(transform.width, true); // implicitly updates height to maintain aspect ratio
      }
      if (tiledImage.getRotation() !== transform.rotation) {
        tiledImage.setRotation(transform.rotation, true);
      }
      if (
        bounds.x !== transform.position.x ||
        bounds.y !== transform.position.y
      ) {
        tiledImage.setPosition(transform.position, true);
      }
      // visibility & opacity --> opacity
      const oldOpacity = tiledImage.getOpacity();
      const newOpacity = this.getOpacity(newRef, c);
      if (oldOpacity !== newOpacity) {
        tiledImage.setOpacity(newOpacity);
        if (oldOpacity === 0 && newOpacity > 0) {
          // OpenSeadragon does not load tiles for invisible images,
          // so we need to trigger a reload when an image becomes visible
          tiledImage.update(true);
        }
      }
    }
    renderedObject.state = {
      object: {
        dataSource: structuredClone(newRef.object.dataSource),
      },
    };
  }

  /**
   * Deletes the rendered object by removing its TiledImages from the OpenSeadragon viewer, or marking it for deletion if the TiledImages have not yet been created
   *
   * The removals are queued by the context (see
   * {@link OpenSeadragonContext.removeTiledImage}) and applied before any tiled
   * image requested after them, so a caller that deletes before it creates still
   * gets the world indices it expects.
   *
   * Deleting a rendered object does not remove it from {@link renderedObjects}.
   *
   * @param renderedObject - The rendered object to delete
   * @returns A promise that resolves once all of its TiledImages have been removed
   */
  protected deleteRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
  ): Promise<void> {
    if (renderedObject.tiledImages === undefined) {
      renderedObject.pendingDelete = true;
      return Promise.resolve();
    }
    return Promise.all(
      renderedObject.tiledImages.map((tiledImage) =>
        this.context.removeTiledImage(tiledImage),
      ),
    ).then(() => {});
  }

  /**
   * Returns the tile sources for the given object data
   *
   * @param data - The object data (image or labels) for which to retrieve the tile sources
   * @returns The tile sources, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object
   */
  protected abstract getTileSources(
    data: TObjectData,
  ): (string | TileSourceConfig | CustomTileSource)[];

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
   * Computes the effective opacity for one of an object's tiled images
   *
   * Returns `0` when either the layer or the object is invisible; otherwise
   * multiplies layer and object opacities. The channel index is ignored here,
   * i.e. all tiled images of an object share the same opacity; subclasses
   * override this to additionally apply per-channel visibility and opacity.
   *
   * @param ref - The object reference for which to compute the opacity
   * @param _c - The index of the tiled image among the object's tiled images,
   * i.e. the index of the channel it renders
   * @returns The effective opacity for the tiled image
   */
  protected getOpacity(
    ref: ObjectRef<TObject, TObjectData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _c: number,
  ): number {
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
 * Mutable state for the tiled images of a single object in the viewer
 *
 * An object occupies `tiledImageCount` consecutive world indices, one tiled
 * image per channel, in the order of its tile sources. The count is known as
 * soon as the rendered object is created, whereas `tiledImages` is assigned only
 * once all of them have been added to the world, which is also when
 * `tiledImagesPromise` resolves.
 */
export type RenderedObject<
  TObject extends Image | Labels,
  TObjectData extends ImageData | LabelsData,
> = {
  ref: ObjectRef<TObject, TObjectData>;
  state: { object: Pick<TObject, "dataSource"> };
  tiledImageCount: number;
  tiledImagesPromise: Promise<OpenSeadragon.TiledImage[]>;
  tiledImages?: OpenSeadragon.TiledImage[];
  pendingDelete?: boolean;
};
