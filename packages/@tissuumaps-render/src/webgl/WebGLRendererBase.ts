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
 * The rendered objects, each owning the GPU resources of one reference, are
 * kept in {@link renderedObjects}, always in the order of the references they
 * were last synchronized against, which is the draw order.
 * {@link cleanRenderedObjects} matches them to the references of a new
 * synchronization, {@link insertRenderedObject} and
 * {@link removeRenderedObject} maintain the list as objects are created and
 * dropped, and {@link destroyRenderedObject} releases the GPU resources of one
 * object.
 */
export abstract class WebGLRendererBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
  TRenderedObject extends RenderedObjectBase<TObject, TObjectData>,
> {
  readonly context: WebGLContext;
  protected viewport: Rect;
  protected renderedObjects: TRenderedObject[] = [];
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
   * The viewport starts out as the unit square; {@link setViewport} is the only
   * way to change it.
   *
   * @param context - The WebGL context to use for rendering
   */
  constructor(context: WebGLContext) {
    this.context = context;
    this.viewport = { x: 0, y: 0, width: 1, height: 1 };
  }

  /**
   * Gets the current viewport
   */
  getViewport(): Rect {
    return this.viewport;
  }

  /**
   * Sets the viewport for the renderer
   *
   * Does not redraw, the caller is expected to redraw whenever the viewport
   * changed.
   *
   * @param viewport - The new viewport to set
   * @returns True if the viewport was changed, false otherwise
   */
  setViewport(viewport: Rect): boolean {
    if (!GeometryUtils.rectEquals(viewport, this.viewport)) {
      this.viewport = viewport;
      return true;
    }
    return false;
  }

  /**
   * Concurrently loads the data of all objects to be rendered on the given layers
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
   * @param layers - The layers to load objects for
   * @param objects - The objects (points or shapes) to load
   * @param tables - The tables that the objects resolve their item layers from
   * @param loadObject - A function to load the data of an object
   * @param loadTable - A function to load the data of a table
   * @param options - Optional abort signal
   * @returns A promise that resolves to one reference per loaded object and layer
   */
  protected async loadObjects(
    layers: Layer[],
    objects: TObject[],
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
    const dataPromises = new Map<string, Promise<TObjectData>>();
    const tableDataPromises = new Map<string, Promise<TableData>>();
    const tableLayersPromises = new Map<string, Promise<string[]>>();
    const layerItemsInfosPromises = new Map<
      string,
      Promise<Map<string, ItemsInfo | null>>
    >();
    const newRefPromises: Promise<ObjectRef<TObject, TObjectData>>[] = [];
    for (const currentLayer of layers) {
      for (const currentObject of objects.filter(
        (object) =>
          object.layer === currentLayer.id || typeof object.layer !== "string",
      )) {
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
          let tableLayersPromise = tableLayersPromises.get(
            tableLayersPromiseKey,
          );
          if (tableLayersPromise === undefined) {
            tableLayersPromise = tableDataPromise.then(async (tableData) => {
              const tableLayers =
                await tableData.loadValues<string>(tableLayersColumn);
              if (tableLayers.length !== tableData.getSize()) {
                throw new Error(
                  `Table with ID '${currentObject.dataSource.table}' has inconsistent size for column '${tableLayersColumn}'`,
                );
              }
              return tableLayers;
            });
            tableLayersPromise.catch((error) => {
              if (!signal?.aborted) {
                console.error(
                  `Failed to load layers from table with ID '${currentObject.dataSource.table}' (column '${tableLayersColumn}')`,
                  error,
                );
              }
            });
            tableLayersPromises.set(tableLayersPromiseKey, tableLayersPromise);
          }
          layerItemsInfosPromise = layerItemsInfosPromises.get(
            currentObject.id,
          );
          if (layerItemsInfosPromise === undefined) {
            layerItemsInfosPromise = Promise.all([
              dataPromise,
              tableDataPromise,
              tableLayersPromise,
            ]).then(([data, tableData, tableLayers]) =>
              this._getLayerItemsInfos(
                data,
                tableData,
                tableLayersColumn,
                tableLayers,
                layers,
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
              layer: currentLayer,
              object: currentObject,
              itemIds: itemsInfo?.itemIds ?? [],
              itemsMask: itemsInfo?.itemsMask,
              data,
            };
          }
          return {
            layer: currentLayer,
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
   * Removes the GPU resources of objects that are no longer referenced, and
   * reorders the remaining ones
   *
   * Matches the rendered objects to the new set of references, by layer,
   * object, contributed items and data source. Every reference is matched at
   * most once, so that duplicates are destroyed rather than orphaned. A matched
   * object adopts the new reference, as the layer- and object-level properties
   * are read from it when drawing, and is returned for reuse; the rest are
   * destroyed. The remaining objects are then reordered to the order of the
   * references, so that a changed draw order takes effect immediately.
   *
   * @param newRefs - The object references to match against
   * @returns The reusable rendered objects, by object reference
   */
  protected cleanRenderedObjects(
    newRefs: ObjectRef<TObject, TObjectData>[],
  ): Map<ObjectRef<TObject, TObjectData>, TRenderedObject> {
    const renderedObjectsByNewRef = new Map<
      ObjectRef<TObject, TObjectData>,
      TRenderedObject
    >();
    for (let i = 0; i < this.renderedObjects.length; i++) {
      const renderedObject = this.renderedObjects[i]!;
      const newRef = newRefs.find(
        (newRef) =>
          !renderedObjectsByNewRef.has(newRef) &&
          renderedObject.ref.layer.id === newRef.layer.id &&
          renderedObject.ref.object.id === newRef.object.id &&
          renderedObject.ref.itemIds === newRef.itemIds &&
          renderedObject.ref.itemsMask === newRef.itemsMask &&
          // check data source configuration instead of data
          deepEqual(renderedObject.state.dataSource, newRef.object.dataSource),
      );
      if (newRef !== undefined) {
        renderedObject.ref = newRef;
        renderedObjectsByNewRef.set(newRef, renderedObject);
      } else {
        this.renderedObjects.splice(i, 1);
        this.destroyRenderedObject(renderedObject);
        i--;
      }
    }
    const newRefIndices = new Map(
      newRefs.map((newRef, index) => [newRef, index] as const),
    );
    this.renderedObjects.sort(
      (a, b) => newRefIndices.get(a.ref)! - newRefIndices.get(b.ref)!,
    );
    return renderedObjectsByNewRef;
  }

  /**
   * Adds a newly created rendered object at its position in the draw order
   *
   * @param renderedObject - The rendered object to add
   * @param newRefs - The references of the current synchronization, in draw
   * order; the object's reference has to be one of them
   */
  protected insertRenderedObject(
    renderedObject: TRenderedObject,
    newRefs: ObjectRef<TObject, TObjectData>[],
  ): void {
    const index = newRefs.indexOf(renderedObject.ref);
    let insertionIndex = this.renderedObjects.findIndex(
      (other) => newRefs.indexOf(other.ref) > index,
    );
    if (insertionIndex === -1) {
      insertionIndex = this.renderedObjects.length;
    }
    this.renderedObjects.splice(insertionIndex, 0, renderedObject);
  }

  /**
   * Removes a rendered object from the draw order and releases its GPU resources
   *
   * @param renderedObject - The rendered object to remove
   */
  protected removeRenderedObject(renderedObject: TRenderedObject): void {
    const index = this.renderedObjects.indexOf(renderedObject);
    if (index !== -1) {
      this.renderedObjects.splice(index, 1);
    }
    this.destroyRenderedObject(renderedObject);
  }

  /**
   * Releases the GPU resources owned by a single rendered object
   *
   * Does not remove the object from {@link renderedObjects}, see
   * {@link removeRenderedObject}.
   */
  protected abstract destroyRenderedObject(
    renderedObject: TRenderedObject,
  ): void;

  /**
   * Gets the bounding box of all rendered objects, in world coordinates
   *
   * @returns The bounds, or null if no objects are rendered
   */
  protected getRenderedBounds(): Rect | null {
    return this.renderedObjects.reduce<Rect | null>((union, renderedObject) => {
      const bounds = TransformUtils.transformBoundingBox(
        renderedObject.objectBounds,
        WebGLUtils.createDataToWorldMatrix(
          renderedObject.ref.object.transform,
          renderedObject.ref.layer.transform,
        ),
      );
      return union !== null ? GeometryUtils.boundingBox(union, bounds) : bounds;
    }, null);
  }

  /**
   * Computes the factor that the alpha of every item of an object is
   * multiplied with when drawing
   *
   * @returns The product of the layer and object opacities, or `0` if the
   * layer or the object is invisible
   */
  protected static computeOpacityFactor(
    ref: ObjectRef<Points | Shapes, PointsData | ShapesData>,
  ): number {
    if (ref.layer.visibility === false || ref.object.visibility === false) {
      return 0;
    }
    return ref.layer.opacity * ref.object.opacity;
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
   * @param tableLayers - The values of the table column, in table item order
   * @param layers - The layers to compute the item masks for
   * @param options - Optional abort signal
   * @returns A promise that resolves to the item IDs and mask of each layer, by
   * layer ID, or to `null` for layers without items
   */
  private async _getLayerItemsInfos(
    data: TObjectData,
    tableData: TableData,
    tableLayersColumn: string,
    tableLayers: string[],
    layers: Layer[],
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
    for (const layer of layers) {
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
          itemLayerIds.set(id, tableLayers[i]!);
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
 * The item IDs and the item mask are cached and shared between references and
 * across calls to {@link WebGLRendererBase.loadObjects}, and must not be
 * modified.
 */
export type ObjectRef<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  layer: Layer;
  object: TObject;
  itemIds: number[];
  itemsMask: Uint8Array | undefined;
  data: TObjectData;
};

/**
 * The rendered state of one {@link ObjectRef}
 *
 * Extended by the renderers with the GPU resources they own, and with the model
 * state their change detection compares against. Rendered objects are mutated
 * in place across synchronizations: {@link WebGLRendererBase.cleanRenderedObjects}
 * replaces the reference of a matched object, and the renderers replace the
 * bounds, the state and the GPU resources of an object as they are rebuilt.
 */
export type RenderedObjectBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  /** The reference the object was last matched to; its layer- and object-level properties are read when drawing */
  ref: ObjectRef<TObject, TObjectData>;
  /** The bounds of the object's items, in data coordinates */
  objectBounds: Rect;
  /** The model state the GPU resources were built from; the data source is what {@link WebGLRendererBase.cleanRenderedObjects} matches on */
  state: Pick<TObject, "dataSource">;
};
