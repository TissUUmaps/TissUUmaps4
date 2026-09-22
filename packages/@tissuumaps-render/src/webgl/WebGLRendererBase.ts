import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  GeometryUtils,
  type Layer,
  type Points,
  type PointsData,
  type Rect,
  type Shapes,
  type ShapesData,
  type Table,
  type TableData,
  TransformUtils,
} from "@tissuumaps/core";

import type { WebGLContext } from "./WebGLContext";
import { WebGLUtils } from "./WebGLUtils";

type ItemsInfo = { itemIds: number[]; itemsMask: Uint8Array };

/**
 * Base class for WebGL renderers that draw the items of objects (points or shapes)
 *
 * Objects are assigned to a layer either as a whole, by layer ID, or per item,
 * by a table column holding the layer ID of each item. {@link loadObjects}
 * resolves both into one {@link ObjectRef} per object and layer.
 *
 * Resolving the per-item assignment is linear in the size of the object and of
 * its table, while {@link loadObjects} runs on every synchronization, i.e. also
 * for changes that leave the layer membership of the items untouched. Its
 * results are therefore cached in {@link _layerItemsInfosCache}, keyed by the
 * identity of the loaded data: the data returned by the loaders passed to
 * {@link loadObjects} has to be immutable, and has to keep its identity for as
 * long as its content is unchanged.
 *
 * The layers and objects to render are set by {@link setModel};
 * {@link needsSynchronization} tells whether the rendered objects have to be
 * synchronized with them. The properties that are applied when drawing are
 * never captured: {@link getRenderPasses} reads them from the current model on
 * every draw, so setting a model that only changes those takes effect on the
 * next draw, with nothing to synchronize.
 *
 * The rendered objects, each owning the GPU resources of one reference, are
 * kept in {@link _renderedObjects}, by layer and object. Their draw order is
 * the order of the layers and objects of the model, read when drawing like
 * every other model property (see {@link getRenderPasses}).
 * {@link matchOrDestroyRenderedObjects} matches them to the references of a new
 * synchronization, {@link addRenderedObject} and
 * {@link removeRenderedObject} add and drop single objects,
 * {@link destroyRenderedObject} releases the GPU resources of one object, and
 * {@link clearRenderedObjects} those of all of them.
 */
export abstract class WebGLRendererBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
  TRenderedObject extends RenderedObjectBase<TObject, TObjectData>,
> {
  readonly context: WebGLContext;
  viewport: Rect = { x: 0, y: 0, width: 1, height: 1 };

  private _model?: { layers: Layer[]; objects: TObject[] };
  private _lastSyncState?: object;
  private readonly _renderedObjects = new Map<
    string,
    Map<string, TRenderedObject>
  >();
  private readonly _layerItemsInfosCache = new WeakMap<
    TObjectData,
    {
      tableData: TableData;
      tableLayersColumn: string;
      layerItemsInfos: Map<string, ItemsInfo | null>;
    }
  >();

  /**
   * Creates a new WebGLRendererBase instance
   *
   * @param context - The WebGL context to use for rendering
   */
  constructor(context: WebGLContext) {
    this.context = context;
  }

  /**
   * Sets the layers and objects to render
   *
   * Layer- and object-level properties are drawn from uniforms, and the draw
   * order is the order of the model, so a change that affects nothing else
   * needs nothing done here: both are read from the new model by the next draw
   * (see {@link getRenderPasses}).
   * Every other change - a different set of layers or objects, layer
   * memberships, data sources or item-level configurations - requires a
   * resynchronization, which the caller is expected to trigger whenever
   * {@link needsSynchronization} says so.
   *
   * Does not redraw: a model that differs at all differs either in a property
   * that is applied when drawing, or in one that requires a resynchronization,
   * so the caller is expected to redraw either way.
   *
   * The layers and objects are cloned, so that what the renderer compares
   * against later - in {@link needsSynchronization}, and in the references of
   * a synchronization - is what it was given, whatever the caller does with its
   * instances afterwards.
   *
   * @param layers - The layers to render
   * @param objects - The objects (points or shapes) to render
   */
  setModel(layers: Layer[], objects: TObject[]): void {
    this._model = structuredClone({ layers, objects });
  }

  /**
   * Returns whether the rendered objects have to be synchronized with the current model
   *
   * Compares the state that a synchronization depends on (see
   * {@link getSyncState}) between the current model and the model the last
   * synchronization was based on (see {@link recordSyncState}). Everything else
   * about the model - the properties that are applied when drawing, and the
   * order of the layers and objects - is fully applied by {@link setModel}.
   */
  needsSynchronization(): boolean {
    return !deepEqual(this.getSyncState(), this._lastSyncState);
  }

  /**
   * Records the current model as the one the rendered objects are being synchronized with
   *
   * Every synchronization has to call this first, before its first `await`: the
   * model may be set again while it runs, and {@link needsSynchronization} has
   * to report such a change against the model the synchronization actually
   * read, not against the one it found when it finished. A synchronization
   * that fails has to hand the returned state back to
   * {@link discardSyncState}, so that the model is synchronized again.
   *
   * @returns The recorded state
   */
  protected recordSyncState(): object | undefined {
    this._lastSyncState = this.getSyncState();
    return this._lastSyncState;
  }

  /**
   * Forgets a recorded synchronization state, unless another synchronization
   * has recorded its own since
   *
   * Called by a synchronization that failed, so that
   * {@link needsSynchronization} reports the model as unsynchronized again. A
   * synchronization that was aborted because a newer one started must not
   * undo what the newer one recorded, hence the identity check.
   *
   * @param syncState - The state the failed synchronization recorded, as
   * returned by {@link recordSyncState}
   */
  protected discardSyncState(syncState: object | undefined): void {
    if (this._lastSyncState === syncState) {
      this._lastSyncState = undefined;
    }
  }

  /**
   * Concurrently loads the data of all objects to be rendered on the layers of the current model
   *
   * An object assigned to a layer by layer ID is loaded for that layer only, an
   * object assigned per item by a table column is loaded for every layer, with
   * the items on each layer resolved from the table (see
   * {@link _getLayerItemsInfos}). The data of an object, and of a table, is
   * loaded once, no matter how many references it is shared by.
   *
   * The returned references are ordered by layer and then by object. Objects
   * whose data or table failed to load are logged and skipped. Objects without
   * items on a layer are skipped silently, which also covers empty objects and
   * objects whose table is empty - those are legitimate states, not failures.
   *
   * @param tables - The tables that the objects resolve their item layers from
   * @param loadObject - A function to load the data of an object
   * @param loadTable - A function to load the data of a table
   * @param options - Optional abort signal
   * @returns A promise that resolves to one reference per loaded object and layer
   * @throws Error if no model has been set (see {@link setModel})
   */
  protected async loadObjects(
    tables: Table[],
    loadObject: (
      object: TObject,
      options?: { signal?: AbortSignal },
    ) => Promise<TObjectData>,
    loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<ObjectRef<TObject, TObjectData>[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const model = this._model;
    if (model === undefined) {
      throw new Error("Model not set");
    }
    const dataPromises = new Map<string, Promise<TObjectData>>();
    const tableDataPromises = new Map<string, Promise<TableData>>();
    const loadedTableLayersPromises = new Map<string, Promise<string[]>>();
    const layerItemsInfosPromises = new Map<
      string,
      Promise<Map<string, ItemsInfo | null>>
    >();
    const newRefPromises: Promise<ObjectRef<TObject, TObjectData>>[] = [];
    for (const currentLayer of model.layers) {
      for (const currentObject of model.objects) {
        if (
          currentObject.layer !== currentLayer.id &&
          typeof currentObject.layer === "string"
        ) {
          continue;
        }
        let dataPromise = dataPromises.get(currentObject.id);
        if (dataPromise === undefined) {
          dataPromise = loadObject(currentObject, { signal });
          dataPromise.catch((error) => {
            if (!signal?.aborted) {
              console.error(
                `Failed to load object with ID '${currentObject.id}'`,
                error,
              );
            }
          });
          dataPromises.set(currentObject.id, dataPromise);
        }
        let layerItemsInfosPromise;
        if (
          typeof currentObject.layer !== "string" &&
          currentObject.dataSource.table !== undefined
        ) {
          let tableDataPromise = tableDataPromises.get(
            currentObject.dataSource.table,
          );
          if (tableDataPromise === undefined) {
            const table = tables.find(
              (table) => table.id === currentObject.dataSource.table,
            );
            if (table !== undefined) {
              tableDataPromise = loadTable(table, { signal });
            } else {
              tableDataPromise = Promise.reject(
                new Error(
                  `Table with ID '${currentObject.dataSource.table}' not found`,
                ),
              );
            }
            tableDataPromise.catch((error) => {
              if (!signal?.aborted) {
                console.error(
                  `Failed to load table with ID '${currentObject.dataSource.table}'`,
                  error,
                );
              }
            });
            tableDataPromises.set(
              currentObject.dataSource.table,
              tableDataPromise,
            );
          }
          const tableId = currentObject.dataSource.table;
          const tableLayersColumn = currentObject.layer.column;
          const tableLayersPromiseKey = `${tableId}:${tableLayersColumn}`;
          let loadedTableLayersPromise = loadedTableLayersPromises.get(
            tableLayersPromiseKey,
          );
          if (loadedTableLayersPromise === undefined) {
            loadedTableLayersPromise = tableDataPromise.then(
              async (tableData) => {
                const loadedTableLayers =
                  await tableData.loadValues<string>(tableLayersColumn);
                if (loadedTableLayers.length !== tableData.getSize()) {
                  throw new Error(
                    `Table with ID '${currentObject.dataSource.table}' has inconsistent size for column '${tableLayersColumn}'`,
                  );
                }
                return loadedTableLayers;
              },
            );
            loadedTableLayersPromise.catch((error) => {
              if (!signal?.aborted) {
                console.error(
                  `Failed to load layers from table with ID '${currentObject.dataSource.table}' (column '${tableLayersColumn}')`,
                  error,
                );
              }
            });
            loadedTableLayersPromises.set(
              tableLayersPromiseKey,
              loadedTableLayersPromise,
            );
          }
          layerItemsInfosPromise = layerItemsInfosPromises.get(
            currentObject.id,
          );
          if (layerItemsInfosPromise === undefined) {
            layerItemsInfosPromise = Promise.all([
              dataPromise,
              tableDataPromise,
              loadedTableLayersPromise,
            ]).then(([data, tableData, loadedTableLayers]) =>
              this._getLayerItemsInfos(
                data,
                tableData,
                tableLayersColumn,
                loadedTableLayers,
                model.layers,
                { signal },
              ),
            );
            layerItemsInfosPromises.set(
              currentObject.id,
              layerItemsInfosPromise,
            );
          }
        }
        const newRefPromise = Promise.all([
          dataPromise,
          layerItemsInfosPromise,
        ]).then(([data, layerItemsInfos]) => {
          signal?.throwIfAborted();
          if (layerItemsInfos !== undefined) {
            const itemsInfo = layerItemsInfos.get(currentLayer.id);
            return {
              layerId: currentLayer.id,
              object: currentObject,
              itemIds: itemsInfo?.itemIds ?? [],
              itemsMask: itemsInfo?.itemsMask,
              data,
            };
          }
          return {
            layerId: currentLayer.id,
            object: currentObject,
            itemIds: data.getIds(),
            itemsMask: undefined,
            data,
          };
        });
        newRefPromises.push(newRefPromise);
      }
    }
    const results = await Promise.allSettled(newRefPromises);
    signal?.throwIfAborted();
    return results
      .filter((result) => result.status === "fulfilled")
      .filter((result) => result.value.itemIds.length > 0)
      .map((result) => result.value);
  }

  /**
   * Matches the rendered objects to a new set of references, and destroys the
   * ones left over
   *
   * A rendered object is matched by the layer and object it is kept under, and
   * kept if its contributed items and data source are those of the reference,
   * which it then adopts and is returned for reuse with. Every other rendered
   * object - one that no reference addresses, or one whose items or data source
   * changed - is destroyed and dropped.
   *
   * @param newRefs - The object references to match against
   * @returns One match per reference, in the order of the references, each with
   * the rendered object to reuse for it, or `undefined` if it has none yet
   */
  protected matchOrDestroyRenderedObjects(
    newRefs: ObjectRef<TObject, TObjectData>[],
  ): {
    newRef: ObjectRef<TObject, TObjectData>;
    renderedObject: TRenderedObject | undefined;
  }[] {
    const matchedRenderedObjects = new Set<TRenderedObject>();
    const matches = newRefs.map((newRef) => {
      const renderedObject = this._renderedObjects
        .get(newRef.layerId)
        ?.get(newRef.object.id);
      if (
        renderedObject !== undefined &&
        renderedObject.ref.itemIds === newRef.itemIds &&
        renderedObject.ref.itemsMask === newRef.itemsMask &&
        // check data source configuration instead of data
        deepEqual(
          renderedObject.ref.object.dataSource,
          newRef.object.dataSource,
        )
      ) {
        renderedObject.ref = newRef;
        matchedRenderedObjects.add(renderedObject);
        return { newRef, renderedObject };
      }
      return { newRef, renderedObject: undefined };
    });
    for (const renderedObjects of this._renderedObjects.values()) {
      for (const [objectId, renderedObject] of renderedObjects) {
        if (!matchedRenderedObjects.has(renderedObject)) {
          renderedObjects.delete(objectId);
          this.destroyRenderedObject(renderedObject);
        }
      }
    }
    return matches;
  }

  /**
   * Gets the bounding box of all drawn objects, in world coordinates
   *
   * Reads the transforms from the current model (see
   * {@link getRenderPasses}), so the bounds follow a model that requires no
   * resynchronization.
   *
   * @returns The bounds, or null if nothing is drawn
   */
  getRenderedBounds(): Rect | null {
    return this.getRenderPasses().reduce<Rect | null>(
      (union, { layer, object, renderedObject }) => {
        const bounds = TransformUtils.transformBoundingBox(
          renderedObject.objectBounds,
          WebGLUtils.createDataToWorldMatrix(object.transform, layer.transform),
        );
        return union !== null
          ? GeometryUtils.boundingBox(union, bounds)
          : bounds;
      },
      null,
    );
  }

  /**
   * Adds a newly created rendered object under its layer and object
   *
   * @param renderedObject - The rendered object to add
   */
  protected addRenderedObject(renderedObject: TRenderedObject): void {
    const { layerId, object } = renderedObject.ref;
    let renderedObjects = this._renderedObjects.get(layerId);
    if (renderedObjects === undefined) {
      renderedObjects = new Map();
      this._renderedObjects.set(layerId, renderedObjects);
    }
    renderedObjects.set(object.id, renderedObject);
  }

  /**
   * Drops a rendered object and releases its GPU resources
   *
   * @param renderedObject - The rendered object to remove
   */
  protected removeRenderedObject(renderedObject: TRenderedObject): void {
    this._renderedObjects
      .get(renderedObject.ref.layerId)
      ?.delete(renderedObject.ref.object.id);
    this.destroyRenderedObject(renderedObject);
  }

  /**
   * Drops all rendered objects and releases their GPU resources
   */
  protected clearRenderedObjects(): void {
    for (const renderedObjects of this._renderedObjects.values()) {
      for (const renderedObject of renderedObjects.values()) {
        this.destroyRenderedObject(renderedObject);
      }
    }
    this._renderedObjects.clear();
  }

  /**
   * Returns one render pass per rendered object to draw, in draw order
   *
   * A pass carries the layer and the object of the current model, and the
   * rendered object holding the GPU resources to draw them with.
   *
   * The properties that are applied when drawing - the transforms, the
   * visibility, the opacity and the point size factors - are read from the
   * layer and the object returned here, never from the reference of a rendered
   * object: the reference holds the object as it was when it was loaded (see
   * {@link ObjectRef}), whereas these are the current ones, so that setting a
   * model that only changes them takes effect without a resynchronization.
   *
   * The model is what is iterated, the way {@link loadObjects} iterates it:
   * by layer, then by object, pairing an object with the layer it is assigned
   * to by ID, or with every layer if its items are assigned to layers by a
   * table column. That order is the draw order. Rendered objects whose layer or
   * object has been removed from the model, or whose object has moved to
   * another layer, are therefore never visited, until the resynchronization
   * that the change requires drops them. Before a model is set, there is
   * nothing to draw.
   */
  protected getRenderPasses(): {
    layer: Layer;
    object: TObject;
    renderedObject: TRenderedObject;
  }[] {
    if (this._model === undefined) {
      return [];
    }
    const renderPasses = [];
    for (const layer of this._model.layers) {
      const renderedObjects = this._renderedObjects.get(layer.id);
      if (renderedObjects === undefined) {
        continue;
      }
      for (const object of this._model.objects) {
        if (object.layer !== layer.id && typeof object.layer === "string") {
          continue;
        }
        const renderedObject = renderedObjects.get(object.id);
        if (renderedObject !== undefined) {
          renderPasses.push({ layer, object, renderedObject });
        }
      }
    }
    return renderPasses;
  }

  /**
   * Releases the GPU resources owned by a single rendered object
   *
   * Does not remove the object from {@link _renderedObjects}, see
   * {@link removeRenderedObject}.
   */
  protected abstract destroyRenderedObject(
    renderedObject: TRenderedObject,
  ): void;

  /**
   * Returns the state of the current model that a synchronization depends on
   *
   * The layers and objects are keyed by ID, so that their order - the draw order
   * - is not part of the state (see {@link getLayerSyncState} and
   * {@link getObjectSyncState} for what is).
   *
   * @returns The state, or `undefined` if no model has been set
   */
  protected getSyncState(): object | undefined {
    if (this._model === undefined) {
      return undefined;
    }
    return {
      layers: Object.fromEntries(
        this._model.layers.map((layer) => [
          layer.id,
          this.getLayerSyncState(layer),
        ]),
      ),
      objects: Object.fromEntries(
        this._model.objects.map((object) => [
          object.id,
          this.getObjectSyncState(object),
        ]),
      ),
    };
  }

  /**
   * Returns the state of a layer that a synchronization depends on
   *
   * The counterpart of {@link getObjectSyncState} for layers. The point size
   * factor is blanked out as well: it is a uniform of the points renderer, and
   * the shapes renderer never reads it. So is the name, which nothing rendered
   * depends on.
   *
   * @param layer - The layer to return the state of
   * @returns The layer without the properties that are applied when drawing,
   * and without the cosmetic ones
   */
  protected getLayerSyncState(layer: Layer): object {
    return {
      ...layer,
      name: undefined,
      transform: undefined,
      visibility: undefined,
      opacity: undefined,
      pointSizeFactor: undefined,
    };
  }

  /**
   * Returns the state of an object that a synchronization depends on
   *
   * Everything but the properties that are applied when drawing, which are read
   * from the current model on every draw (see {@link getRenderPasses}) and
   * hence need no synchronization, and but the cosmetic ones, which nothing
   * rendered depends on. Those are blanked out rather than dropped, so that a
   * property added to the model later is part of the state, and thereby
   * requires a resynchronization, unless it is blanked out here as well.
   *
   * The result is only ever deep-compared against that of another object, hence
   * the opaque return type.
   *
   * @param object - The object (points or shapes) to return the state of
   * @returns The object without the properties that are applied when drawing,
   * and without the cosmetic ones
   */
  protected getObjectSyncState(object: TObject): object {
    return {
      ...object,
      name: undefined,
      transform: undefined,
      visibility: undefined,
      opacity: undefined,
    };
  }

  /**
   * Computes the factor that the alpha of every item of an object is
   * multiplied with when drawing
   *
   * @param layer - The layer the object is drawn on, as of the current model
   * @param object - The object being drawn, as of the current model
   * @returns The product of the layer and object opacities, or `0` if the
   * layer or the object is invisible
   */
  protected static computeOpacityFactor(
    layer: Layer,
    object: Points | Shapes,
  ): number {
    if (layer.visibility === false || object.visibility === false) {
      return 0;
    }
    return layer.opacity * object.opacity;
  }

  /**
   * Creates the loader for the table that an object resolves its properties
   * from
   *
   * @param ref - The object reference
   * @param tables - The tables to look the object's table up in
   * @param loadTable - A function to load the data of a table
   * @returns The loader, or `undefined` if the object has no table, or its
   * table was not found (which is logged)
   */
  protected static createObjectTableLoader(
    ref: ObjectRef<Points | Shapes, PointsData | ShapesData>,
    tables: Table[],
    loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
  ): ((options?: { signal?: AbortSignal }) => Promise<TableData>) | undefined {
    if (ref.object.dataSource.table === undefined) {
      return undefined;
    }
    const table = tables.find(
      (table) => table.id === ref.object.dataSource.table,
    );
    if (table === undefined) {
      console.warn(`Table with ID '${ref.object.dataSource.table}' not found`);
      return undefined;
    }
    return (options?: { signal?: AbortSignal }) => loadTable(table, options);
  }

  /**
   * Returns the items of an object that belong to each of the given layers
   *
   * Layers that are missing from {@link _layerItemsInfosCache} are computed in a
   * single pass over the items of the object, sharing one lookup from item ID to
   * layer ID, and are added to the cache. Layers that are already cached for the
   * same object data, table data and layer column are re-used as they are. Item
   * IDs and masks are only allocated for layers that turn out to contain items,
   * layers without items are cached as `null`.
   *
   * @param data - The data of the object to compute the item masks for
   * @param tableData - The data of the table holding the item layers
   * @param tableLayersColumn - The name of the table column holding the layer IDs
   * @param loadedTableLayers - The values of the table column, in table item order
   * @param currentLayers - The layers to compute the item masks for
   * @param options - Optional abort signal
   * @returns A promise that resolves to the item IDs and mask of each layer, by
   * layer ID, or to `null` for layers without items
   */
  private async _getLayerItemsInfos(
    data: TObjectData,
    tableData: TableData,
    tableLayersColumn: string,
    loadedTableLayers: string[],
    currentLayers: Layer[],
    options?: { signal?: AbortSignal },
  ): Promise<Map<string, ItemsInfo | null>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let entry = this._layerItemsInfosCache.get(data);
    if (
      entry === undefined ||
      entry.tableData !== tableData ||
      entry.tableLayersColumn !== tableLayersColumn
    ) {
      entry = { tableData, tableLayersColumn, layerItemsInfos: new Map() };
      this._layerItemsInfosCache.set(data, entry);
    }
    const newLayerIds = new Set<string>();
    for (const layer of currentLayers) {
      if (!entry.layerItemsInfos.has(layer.id)) {
        newLayerIds.add(layer.id);
      }
    }
    if (newLayerIds.size > 0) {
      const itemIds = data.getIds();
      const itemLayerIds = new Map<number, string>();
      await AsyncUtils.forEach(
        tableData.getIds(),
        (id, i) => {
          itemLayerIds.set(id, loadedTableLayers[i]!);
        },
        { signal },
      );
      const newLayerItemsInfos = new Map<string, ItemsInfo>();
      await AsyncUtils.forEach(
        itemIds,
        (itemId, i) => {
          const layerId = itemLayerIds.get(itemId);
          if (layerId !== undefined && newLayerIds.has(layerId)) {
            let newItemsInfo = newLayerItemsInfos.get(layerId);
            if (newItemsInfo === undefined) {
              newItemsInfo = {
                itemIds: [],
                itemsMask: new Uint8Array(itemIds.length),
              };
              newLayerItemsInfos.set(layerId, newItemsInfo);
            }
            newItemsInfo.itemIds.push(itemId);
            newItemsInfo.itemsMask[i] = 1;
          }
        },
        { signal },
      );
      for (const newLayerId of newLayerIds) {
        entry.layerItemsInfos.set(
          newLayerId,
          newLayerItemsInfos.get(newLayerId) ?? null,
        );
      }
    }
    return entry.layerItemsInfos;
  }
}

/**
 * A reference to a points or shapes object on a specific layer
 *
 * Identifies the layer, and carries the object as it was when the reference was
 * loaded: everything that is resolved into a GPU resource is read from it, so
 * that one synchronization sees one consistent model state, however often the
 * model is set while it runs. The properties that are applied when drawing are
 * not read from it - those come from the current model, which may have moved on
 * since (see {@link WebGLRendererBase.getRenderPasses}).
 *
 * The item IDs and the item mask are cached and shared between references and
 * across calls to {@link WebGLRendererBase.loadObjects}, and must not be
 * modified.
 */
export type ObjectRef<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  layerId: string;
  object: TObject;
  itemIds: number[];
  itemsMask: Uint8Array | undefined;
  data: TObjectData;
};

/**
 * The rendered state of one {@link ObjectRef}
 *
 * Extended by the renderers with the GPU resources they own, and with a
 * snapshot of the object properties those were built from, which their change
 * detection compares against. Rendered objects are mutated in place across
 * synchronizations:
 * {@link WebGLRendererBase.matchOrDestroyRenderedObjects} replaces the
 * reference of a matched object, and the renderers replace the bounds, the
 * snapshot and the GPU resources of an object as they are rebuilt.
 */
export type RenderedObjectBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  /** The reference the object was last matched to, holding what its GPU resources were resolved from */
  ref: ObjectRef<TObject, TObjectData>;
  /** The bounds of the object's items, in data coordinates */
  objectBounds: Rect;
};
