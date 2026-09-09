import { deepEqual } from "fast-equals";
import type OpenSeadragon from "openseadragon";

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
} from "@tissuumaps/core";

import type {
  DataTransfer,
  OpenSeadragonContext,
} from "./OpenSeadragonContext";
import { OpenSeadragonUtils } from "./OpenSeadragonUtils";

/**
 * Base class for OpenSeadragon renderers that manage tiled images for objects (images or labels)
 *
 * Each renderer owns an anchor, an invisible tiled image spanning everything the
 * renderer contributes to the world (see
 * {@link OpenSeadragonContext.updateBounds}). Renderers share a viewer, so the
 * anchor also marks where the renderer's own tiled images belong: they directly
 * follow the anchor, in the order of {@link _renderedObjects}, with one tiled
 * image per channel of each object.
 *
 * The tiled images of an object that uses additive blending are preceded by one
 * more tiled image, its backdrop (see {@link usesAdditiveBlending}).
 *
 * Tiled images are inserted behind the anchor when they are added, rather than
 * moved there afterwards, as OpenSeadragon's navigator cannot keep up with
 * reordering. {@link _cleanRenderedObjects} recreates those that are out of place.
 */
export abstract class OpenSeadragonRendererBase<
  TObject extends Image | Labels,
  TObjectData extends ImageData | LabelsData,
  TSyncContext extends {
    loadObject: (
      object: TObject,
      options?: { signal?: AbortSignal },
    ) => Promise<TObjectData>;
  },
> {
  private static _defaultBounds = { x: 0, y: 0, width: 1, height: 1 };

  readonly context: OpenSeadragonContext;
  private _anchor: OpenSeadragon.TiledImage | undefined;
  private _renderedObjects: RenderedObject<TObject, TObjectData>[] = [];
  private _anchorTaskPromise: Promise<unknown> = Promise.resolve();
  private _destroyed: boolean = false;
  private _extraBounds: Rect[] = [];

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
   * Synchronizes the viewer's tiled images with the current model state
   *
   * Loads all objects assigned to the given layers, removes the tiled images
   * that are no longer needed, and creates or updates the remaining ones.
   * Resolves once the tiled images have actually been added to the world, i.e.
   * once the viewer reflects the given model state.
   *
   * Objects whose tiled images cannot be created, e.g. because their data
   * provides no tile sources, are logged and skipped, just like objects whose
   * data failed to load (see {@link _loadObjects}).
   *
   * @param layers - Layers to render
   * @param objects - Objects (images or labels) to display
   * @param context - The inputs to synchronize with: an immutable snapshot of
   * the model state and loaders that the renderer needs. It carries inputs
   * only; a renderer that derives state from an object does so in
   * {@link resolveObject}.
   * @param options - Optional abort signal
   */
  async synchronize(
    layers: Layer[],
    objects: TObject[],
    context: TSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    this.retainObjects(objects);
    const newRefs = await this._loadObjects(layers, objects, context, {
      signal,
    });
    let offset = 0;
    const newRenderedObjects: RenderedObject<TObject, TObjectData>[] = [];
    const renderedObjectsByNewRef = await this._cleanRenderedObjects(newRefs, {
      signal,
    });
    for (const newRef of newRefs) {
      let renderedObject = renderedObjectsByNewRef.get(newRef);
      if (renderedObject === undefined) {
        try {
          renderedObject = this._createRenderedObject(offset, newRef, {
            signal,
          });
        } catch (error) {
          console.error(
            `Failed to create tiled images for object with ID '${newRef.object.id}'`,
            error,
          );
          continue;
        }
      } else {
        this._updateRenderedObject(renderedObject, newRef);
      }
      newRenderedObjects.push(renderedObject);
      const useBackdrop = this.usesAdditiveBlending(renderedObject.ref.data);
      offset += (useBackdrop ? 1 : 0) + renderedObject.tileSourceCount;
    }
    this._renderedObjects = newRenderedObjects;
    await Promise.allSettled(
      newRenderedObjects.map(
        (renderedObject) => renderedObject.tiledImagesPromise,
      ),
    );
    signal?.throwIfAborted(); // Promise.allSettled() does not throw on abort
    await this.updateBounds({ signal });
  }

  /**
   * Resizes the anchor to the bounding box of all tiled images and extra bounds
   *
   * Rendered objects whose tiled images have not been added to the world yet are
   * ignored; they update the anchor themselves upon arrival (see
   * {@link _createRenderedObject}). Does nothing once the renderer has been
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
      for (const renderedObject of this._renderedObjects) {
        if (renderedObject.backdrop !== undefined) {
          tiledImageBounds.push(renderedObject.backdrop.getBounds());
        }
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
   * Destroys the renderer by removing the anchor tiled image and all rendered objects from the OpenSeadragon viewer
   *
   * Rendered objects whose tiled images have not been added to the world yet are
   * only marked for deletion, and are removed as soon as they arrive.
   *
   * The renderer is unusable afterwards: it has no anchor anymore, so
   * {@link updateBounds} does nothing, {@link _cleanRenderedObjects} throws, and
   * tiled images that still arrive are removed right away.
   */
  async destroy(): Promise<void> {
    this._destroyed = true;
    for (const renderedObject of this._renderedObjects) {
      await this._deleteRenderedObject(renderedObject);
    }
    this._renderedObjects = [];
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
   * Retains what was resolved for the given objects, and discards the rest
   *
   * Called by {@link synchronize} before any object is loaded, with the objects
   * that are about to be displayed. Does nothing here; subclasses that keep
   * state per object (see {@link resolveObject}) override this to drop the
   * state of every object that is not among the given ones.
   *
   * @param _objects - The objects (images or labels) about to be displayed
   */
  protected retainObjects(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _objects: TObject[],
  ): void {}

  /**
   * Resolves what a renderer derives from an object, once its data has loaded
   *
   * Called by {@link _loadObjects} for every object on one of the given layers,
   * concurrently, right after
   * its data has loaded and before its tiled images are created or updated. An
   * object that cannot be resolved is logged, but kept: its tiled images are
   * still created or updated, with whatever the synchronous hooks return for
   * it. Does nothing here; subclasses override this to resolve, from the
   * object, its data and the inputs of the synchronization, whatever their
   * synchronous hooks return later (see {@link getTiledImageDataTransfer}),
   * and to keep it for as long as its outcome would not change.
   *
   * @param _object - The object (image or labels) to resolve
   * @param _data - The loaded data of the object
   * @param _context - The inputs of the current synchronization
   * @param _options - Optional abort signal
   * @returns A promise that resolves once the object has been resolved
   */
  protected resolveObject(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _object: TObject,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: TObjectData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: TSyncContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: { signal?: AbortSignal },
  ): Promise<void> {
    return Promise.resolve();
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
   * Returns whether the channels of the given object data are blended additively
   *
   * The channels of an object that blends additively are composited with
   * OpenSeadragon's "lighter" operation onto an opaque black backdrop below
   * them, so that they add up among themselves while the backdrop hides
   * whatever is below the object, thereby compositing the object as a whole over
   * it. Objects that do not blend additively have no backdrop and keep
   * OpenSeadragon's default composite operation, i.e. each of their channels is
   * composited over the one below it.
   *
   * @param _data - The object data (image or labels) to check
   * @returns Whether the object's channels are blended additively. Defaults to `false`.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected usesAdditiveBlending(_data: TObjectData): boolean {
    return false;
  }

  /**
   * Computes the effective opacity for one of an object's tiled images
   *
   * Returns `0` when either the layer or the object is invisible; otherwise
   * multiplies layer and object opacities. The channel index is ignored here,
   * i.e. all tiled images of an object share the same opacity; subclasses
   * override this to additionally apply per-channel visibility and opacity. The
   * channel index is omitted for an object's backdrop, which carries the opacity
   * of the object itself.
   *
   * @param ref - The object reference for which to compute the opacity
   * @param _index - The index of the tiled image (e.g. channel), or `null` for the object's backdrop
   * @returns The effective opacity for the tiled image
   */
  protected getTiledImageOpacity(
    ref: ObjectRef<TObject, TObjectData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _index: number | null,
  ): number {
    const visibility = ref.layer.visibility && ref.object.visibility;
    const opacity = ref.layer.opacity * ref.object.opacity;
    return visibility ? opacity : 0;
  }

  /**
   * Returns the data transfer for one of an object's tiled images
   *
   * Returns `undefined` here, i.e. the tiles are drawn as they are; subclasses
   * whose tiles carry values rather than colors override this to map the values
   * to colors (see {@link OpenSeadragonContext.updateTiledImageDataTransfer}).
   * As data transfers are compared by identity, the returned object has to stay
   * the same for as long as its outcome would not change. This hook is
   * synchronous; subclasses resolve the data transfer once the object's data
   * has loaded (see {@link resolveObject}), and only return it here.
   *
   * @param _ref - The object reference for which to get the data transfer
   * @param _index - The index of the tiled image (e.g. channel), or `null` for the object's backdrop
   * @returns The data transfer to apply, or `undefined` for none. Defaults to
   * `undefined`.
   */
  protected getTiledImageDataTransfer(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ref: ObjectRef<TObject, TObjectData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _index: number | null,
  ): DataTransfer | undefined {
    return undefined;
  }

  /**
   * Concurrently loads and resolves all objects assigned to the specified layers
   *
   * Each object's data is loaded with the context's `loadObject`, and the object
   * is then resolved (see {@link resolveObject}). The returned references are
   * ordered by layer and then by object, which determines the order of the
   * corresponding tiled images in the world. Objects whose data failed to load
   * are logged and skipped; objects that could not be resolved are logged, but
   * kept.
   *
   * @param layers - The layers for which to load objects
   * @param objects - The objects to load (images or labels), filtered by layer membership
   * @param context - The inputs of the current synchronization
   * @param options - Optional abort signal
   * @returns A promise that resolves to one object reference per successfully loaded object
   */
  private async _loadObjects(
    layers: Layer[],
    objects: TObject[],
    context: TSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<ObjectRef<TObject, TObjectData>[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefPromises: Promise<ObjectRef<TObject, TObjectData>>[] = [];
    for (const currentLayer of layers) {
      for (const currentObject of objects.filter(
        (object) => object.layer === currentLayer.id,
      )) {
        const newRefPromise = context
          .loadObject(currentObject, { signal })
          .then(async (data) => {
            try {
              await this.resolveObject(currentObject, data, context, {
                signal,
              });
            } catch (error) {
              if (signal?.aborted) {
                throw error;
              }
              console.error(
                `Failed to resolve object with ID '${currentObject.id}'`,
                error,
              );
            }
            return { layer: currentLayer, object: currentObject, data };
          });
        newRefPromise.catch((error) => {
          if (!signal?.aborted) {
            console.error(
              `Failed to load object with ID '${currentObject.id}'`,
              error,
            );
          }
        });
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
   * layer with an unchanged data source, and if its backdrop, if any, and all of
   * its tiled images already sit at the consecutive world indices expected for
   * its position among the reusable references, counted from the anchor. A
   * partially misplaced object is not reusable. All other rendered objects are
   * deleted, and are expected to be recreated by the caller via
   * {@link _createRenderedObject}, which is also how the world is reordered.
   *
   * @param newRefs - The new object references, in the intended world order
   * @param options - Optional abort signal
   * @returns A map of new object references to their reusable rendered objects
   * @throws Error if the renderer has no anchor, i.e. it is not initialized or
   * already destroyed
   */
  private async _cleanRenderedObjects(
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
      const renderedObject = this._renderedObjects.find(
        (renderedObject) =>
          renderedObject.ref.layer.id === newRef.layer.id &&
          renderedObject.ref.object.id === newRef.object.id &&
          deepEqual(
            renderedObject.state.object.dataSource,
            newRef.object.dataSource,
          ),
      );
      if (renderedObject !== undefined) {
        const useBackdrop = this.usesAdditiveBlending(newRef.data);
        if (
          // not using a backdrop or backdrop exists and is at the expected index
          (!useBackdrop ||
            (renderedObject.backdrop !== undefined &&
              this.context.getTiledImageIndex(renderedObject.backdrop) ===
                anchorIndex + offset)) &&
          // tiled images exist and are at the expected indices
          renderedObject.tiledImages !== undefined &&
          renderedObject.tiledImages.every(
            (tiledImage, c) =>
              this.context.getTiledImageIndex(tiledImage) ===
              anchorIndex + offset + (useBackdrop ? 1 : 0) + c,
          )
        ) {
          renderedObjectsByNewRef.set(newRef, renderedObject);
          survivors.add(renderedObject);
        }
        offset += (useBackdrop ? 1 : 0) + renderedObject.tileSourceCount;
      }
    }
    for (const renderedObject of this._renderedObjects) {
      if (!survivors.has(renderedObject)) {
        await this._deleteRenderedObject(renderedObject);
        signal?.throwIfAborted();
      }
    }
    this._renderedObjects = [...survivors];
    return renderedObjectsByNewRef;
  }

  /**
   * Creates a new rendered object for the given object reference and adds one TiledImage per channel, preceded by a backdrop where required, to the world
   *
   * The TiledImages are inserted at consecutive indices, starting `offset` places
   * after the anchor, which establishes the world layout that
   * {@link _cleanRenderedObjects} expects. `offset` therefore counts TiledImages,
   * not objects, and callers have to advance it by
   * {@link RenderedObject.tileSourceCount} plus the object's backdrop, if it has
   * one. The indices are resolved once each addition is executed, as the anchor
   * may have been replaced, and world indices may have shifted, while it was
   * enqueued.
   *
   * The tile sources are opened here, rather than by the additions themselves,
   * so that the backdrop can be sized like the object's content, which is only
   * known once one of them has been opened. The additions are all requested
   * before this function returns, and in world order, so that the TiledImages of
   * the object that the caller creates next end up behind them.
   *
   * Returns before the TiledImages exist: they are added asynchronously and only
   * then assigned to the rendered object, transformed, and included in the anchor
   * bounds, which is when {@link RenderedObject.tiledImagesPromise} resolves. The
   * backdrop and TiledImages are removed again immediately after they were added
   * if the rendered object is deleted or the operation is aborted in the
   * meantime, or if any of them could not be added at all - a partially added
   * object would shift the world indices of every object after it. If the context
   * is destroyed, nothing is done at all, as the viewer tears down its world
   * itself.
   *
   * @param offset - The number of TiledImages between the anchor and the object's first new TiledImage
   * @param newRef - The object reference for which to create a rendered object
   * @param options - Optional abort signal
   * @returns The newly created rendered object, which does not have TiledImages yet
   * @throws Error if the object data provides no tile sources
   */
  private _createRenderedObject(
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
    const useBackdrop = this.usesAdditiveBlending(newRef.data);
    const tileSourcePromises = tileSources.map((tileSource) =>
      this.context.openTileSource({ tileSource }, { signal }),
    );
    const backdropTileSourcePromise = useBackdrop
      ? tileSourcePromises[0]!.then((firstTileSource) =>
          OpenSeadragonUtils.createPixelTileSource(
            {
              width: firstTileSource.dimensions.x,
              height: firstTileSource.dimensions.y,
            },
            OpenSeadragonUtils.blackPixelUrl,
          ),
        )
      : undefined;
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
      tileSourceCount: tileSources.length,
      tiledImagesPromise,
    };
    let backdropPromise: Promise<OpenSeadragon.TiledImage> | undefined;
    if (useBackdrop && backdropTileSourcePromise !== undefined) {
      backdropPromise = this.context.addTiledImage(
        {
          tileSource: backdropTileSourcePromise,
          opacity: 0, // only make visible once transformed
          // OBS: explicitly setting this would exclude the backdrop from the WebGL drawer's batched path!
          // compositeOperation: "source-over",
        },
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
      );
      backdropPromise.catch(() => {}); // prevent unhandled rejections in console
    }
    const tiledImagePromises = tileSourcePromises.map(
      (tileSourcePromise, index) => {
        const tiledImagePromise = this.context.addTiledImage(
          {
            tileSource: tileSourcePromise,
            opacity: 0, // only make visible once transformed
            ...(useBackdrop && { compositeOperation: "lighter" }),
          },
          {
            signal,
            getIndex: () => {
              if (this._anchor !== undefined) {
                const anchorIndex = this.context.getTiledImageIndex(
                  this._anchor,
                );
                if (anchorIndex !== -1) {
                  return (
                    anchorIndex + 1 + offset + (useBackdrop ? 1 : 0) + index
                  );
                }
              }
              return undefined;
            },
          },
        );
        tiledImagePromise.catch(() => {}); // prevent unhandled rejections in console
        return tiledImagePromise;
      },
    );
    Promise.allSettled([backdropPromise, ...tiledImagePromises])
      .then(async (results) => {
        const [backdropResult, ...tiledImageResults] = results;
        const backdrop =
          backdropResult?.status === "fulfilled"
            ? backdropResult.value
            : undefined;
        const tiledImages = tiledImageResults
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
          if (backdrop !== undefined) {
            await this.context.removeTiledImage(backdrop);
          }
          for (const tiledImage of tiledImages) {
            await this.context.removeTiledImage(tiledImage);
          }
          signal?.throwIfAborted();
          if (failure !== undefined) {
            console.error(
              `Failed to add tiled images for object with ID '${newRef.object.id}'`,
              failure.reason,
            );
            throw new Error("Failed to add tiled images", {
              cause: failure.reason,
            });
          }
        } else {
          newRenderedObject.backdrop = backdrop;
          newRenderedObject.tiledImages = tiledImages;
          this._updateRenderedObject(newRenderedObject);
          await this.updateBounds({ signal });
        }
        return tiledImages;
      })
      .then(resolveTiledImagesPromise, rejectTiledImagesPromise);
    return newRenderedObject;
  }

  /**
   * Applies the transform, visibility, and opacity of an object reference to the rendered object's backdrop and TiledImages
   *
   * The opacity is computed per TiledImage via {@link getTiledImageOpacity}, so that
   * subclasses can vary it by channel; all other properties are shared by all
   * TiledImages of an object, and by its backdrop. The backdrop is opaque where
   * the object is, so it gets {@link getTiledImageOpacity} without a channel index. The
   * applied data source is recorded in the rendered object's state, where
   * {@link _cleanRenderedObjects} picks it up to detect TiledImages that have to
   * be recreated.
   *
   * @param renderedObject - The rendered object to update
   * @param newRef - The new object reference to update the rendered object with. If not provided, the existing reference will be used.
   * @throws Error if the TiledImages have not been created yet
   */
  private _updateRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
    newRef: ObjectRef<TObject, TObjectData> = renderedObject.ref,
  ): void {
    if (renderedObject.tiledImages === undefined) {
      throw new Error("Rendered object not loaded");
    }
    renderedObject.ref = newRef;
    if (renderedObject.backdrop !== undefined) {
      this._updateTiledImage(renderedObject.backdrop, newRef, null);
    }
    for (let index = 0; index < renderedObject.tiledImages.length; index++) {
      const tiledImage = renderedObject.tiledImages[index]!;
      this._updateTiledImage(tiledImage, newRef, index);
    }
    renderedObject.state = {
      object: {
        dataSource: structuredClone(newRef.object.dataSource),
      },
    };
  }

  /**
   * Deletes the rendered object by removing its backdrop and TiledImages from the OpenSeadragon viewer, or marking it for deletion if the TiledImages have not yet been created
   *
   * The removals are queued by the context (see
   * {@link OpenSeadragonContext.removeTiledImage}) and applied before any tiled
   * image requested after them, so a caller that deletes before it creates still
   * gets the world indices it expects.
   *
   * Deleting a rendered object does not remove it from {@link _renderedObjects}.
   *
   * @param renderedObject - The rendered object to delete
   * @returns A promise that resolves once its backdrop and all of its TiledImages have been removed
   */
  private _deleteRenderedObject(
    renderedObject: RenderedObject<TObject, TObjectData>,
  ): Promise<void> {
    if (renderedObject.tiledImages === undefined) {
      renderedObject.pendingDelete = true;
      return Promise.resolve();
    }
    const promises = renderedObject.tiledImages.map((tiledImage) =>
      this.context.removeTiledImage(tiledImage),
    );
    if (renderedObject.backdrop !== undefined) {
      promises.push(this.context.removeTiledImage(renderedObject.backdrop));
    }
    return Promise.all(promises).then(() => {});
  }

  /**
   * Applies the transform, opacity and data transfer of an object reference to a single TiledImage
   *
   * Only properties whose value actually changed are written, as each write
   * triggers a redraw. The data transfer is applied to the TiledImage's tiles
   * (see {@link OpenSeadragonContext.updateTiledImageDataTransfer}).
   *
   * @param tiledImage - The TiledImage to update
   * @param ref - The object reference whose transform to apply
   * @param index - The index of the tiled image (e.g. channel), or `null` for the object's backdrop
   */
  private _updateTiledImage(
    tiledImage: OpenSeadragon.TiledImage,
    ref: ObjectRef<TObject, TObjectData>,
    index: number | null,
  ): void {
    // transform --> flip, width, rotation, position
    // The bounds are taken without rotation, as OpenSeadragon rotates them
    // around the image center, which would offset the position of any rotated
    // tiled image and thus trigger a redundant write on every update.
    const bounds = tiledImage.getBoundsNoRotate();
    const transform = OpenSeadragonUtils.getTiledImageTransform(
      ref.object.transform,
      ref.layer.transform,
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
    const opacity = this.getTiledImageOpacity(ref, index);
    const oldOpacity = tiledImage.getOpacity();
    if (opacity !== oldOpacity) {
      tiledImage.setOpacity(opacity);
      if (oldOpacity === 0 && opacity > 0) {
        // OpenSeadragon does not load tiles for invisible images,
        // so we need to trigger a reload when an image becomes visible
        tiledImage.update(/* viewportChanged */ false);
      }
    }
    // (channel/label) values --> data transfer
    const dataTransfer = this.getTiledImageDataTransfer(ref, index);
    this.context.updateTiledImageDataTransfer(tiledImage, dataTransfer);
  }

  /**
   * Appends a task to the anchor task queue
   *
   * Tasks are run one at a time, in call order, and a failing task does not
   * prevent subsequent tasks from running. Every task that reads or writes
   * {@link _anchor} has to be enqueued here: concurrent tasks would each replace
   * the anchor they captured, leaving the anchors created in between orphaned in
   * the world, which shifts all subsequent world indices and thereby invalidates
   * the layout expected by {@link _cleanRenderedObjects}.
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
 * An object occupies `tileSourceCount` consecutive world indices, one tiled
 * image per channel, in the order of its tile sources, preceded by that of its
 * `backdrop`: the opaque black tiled image that the channels of an additively
 * blended object add up on (see
 * {@link OpenSeadragonRendererBase.usesAdditiveBlending}). The count is known as
 * soon as the rendered object is created, whereas `backdrop` and `tiledImages`
 * are assigned only once all of them have been added to the world, which is also
 * when `tiledImagesPromise` resolves, with `tiledImages` alone.
 */
export type RenderedObject<
  TObject extends Image | Labels,
  TObjectData extends ImageData | LabelsData,
> = {
  ref: ObjectRef<TObject, TObjectData>;
  state: { object: Pick<TObject, "dataSource"> };
  tileSourceCount: number;
  tiledImagesPromise: Promise<OpenSeadragon.TiledImage[]>;
  tiledImages?: OpenSeadragon.TiledImage[];
  backdrop?: OpenSeadragon.TiledImage;
  pendingDelete?: boolean;
};
