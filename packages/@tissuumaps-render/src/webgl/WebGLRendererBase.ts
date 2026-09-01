import {
  AsyncUtils,
  GeometryUtils,
  type Layer,
  MathUtils,
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
   * @param context - The WebGL context to use for rendering
   * @param options - Optional initial viewport, defaulting to the unit square
   */
  constructor(context: WebGLContext, options?: { viewport?: Rect }) {
    const { viewport } = options ?? {};
    this.context = context;
    this.viewport = viewport ?? { x: 0, y: 0, width: 1, height: 1 };
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
          renderedObject.ref.layer,
        ),
      );
      return union !== null ? GeometryUtils.boundingBox(union, bounds) : bounds;
    }, null);
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

  /**
   * Folds resolved visibilities and opacities into the alpha channel of resolved
   * colors, in place
   *
   * The three are resolved independently, so that none of them has to wait for
   * the others (see the two-pass loading of the renderers). This combines them
   * into what the shaders sample: `(color << 8) + alpha`, where the alpha is the
   * item's opacity, or `0` where it is invisible.
   *
   * All three buffers have to be of the same length; where they are padded, the
   * padding is folded along with the rest and never sampled.
   *
   * @param colors - The packed colors without alpha, overwritten with the result
   * @param visibilities - The resolved visibilities, `0` for invisible
   * @param opacities - The resolved alpha values
   * @param options - Optional abort signal
   */
  protected static packAlpha(
    colors: Uint32Array,
    visibilities: Uint8Array,
    opacities: Uint8Array,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    return AsyncUtils.forEach(
      colors,
      (color, i) => {
        color = MathUtils.safeLeftShift(color, 8);
        if (visibilities[i]! > 0) {
          color += opacities[i]!;
        }
        colors[i] = color;
      },
      options,
    );
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
 * state their change detection compares against.
 */
export type RenderedObjectBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  ref: ObjectRef<TObject, TObjectData>;
  objectBounds: Rect;
};
