import {
  AsyncUtils,
  GeometryUtils,
  type Layer,
  type Points,
  type PointsData,
  type Rect,
  type Shapes,
  type ShapesData,
  type TableData,
  TransformUtils,
} from "@tissuumaps/core";

import type { WebGLContext } from "./WebGLContext";
import { WebGLUtils } from "./WebGLUtils";

/**
 * Base class for WebGL renderers
 *
 * @param TObject - The type of the object (Points or Shapes)
 * @param TObjectData - The type of the object data (PointsData or ShapesData)
 * @param TRenderedObject - The type of the rendered object (extends RenderedObjectBase)
 */
export abstract class WebGLRendererBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
  TRenderedObject extends RenderedObjectBase<TObject, TObjectData>,
> {
  readonly context: WebGLContext;
  protected viewport: Rect;
  protected renderedObjects: TRenderedObject[] = [];

  /**
   * Creates a new WebGLRendererBase instance
   *
   * @param context - The WebGL context to use for rendering
   */
  constructor(context: WebGLContext, options?: { viewport?: Rect }) {
    const { viewport } = options ?? {};
    this.context = context;
    this.viewport = viewport ?? { x: 0, y: 0, width: 1, height: 1 };
  }

  /**
   * Gets the current viewport
   *
   * @returns The current viewport as a Rect object
   * @throws Error if the renderer is not initialized
   */
  getViewport(): Rect {
    return this.viewport;
  }

  /**
   * Sets the viewport for the renderer and redraws if it has changed
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
   * Loads objects for the given layers and returns an array of ObjectRef instances
   *
   * @param layers - The layers to load objects for
   * @param objects - The objects (images or labels) to load
   * @param loadObject - A function to load an object by its ID
   * @param loadTable - A function to load a table by its ID
   * @param options - Optional options for the loading process, including an AbortSignal
   * @returns A promise that resolves to an array of ObjectRef instances for the loaded objects
   */
  protected async loadObjects(
    layers: Layer[],
    objects: TObject[],
    loadObject: (
      objectId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TObjectData>,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<ObjectRef<TObject, TObjectData>[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefs: ObjectRef<TObject, TObjectData>[] = [];
    const dataCache = new Map<string, TObjectData | undefined>();
    const itemLayersCache = new Map<string, Map<number, string> | undefined>();
    for (const currentLayer of layers) {
      for (const currentObject of objects.filter(
        (object) =>
          object.layer === currentLayer.id || typeof object.layer !== "string",
      )) {
        let data;
        if (dataCache.has(currentObject.id)) {
          data = dataCache.get(currentObject.id);
        } else {
          try {
            data = await loadObject(currentObject.id, { signal });
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load object with ID '${currentObject.id}'`,
                error,
              );
            }
          } finally {
            signal?.throwIfAborted();
          }
          dataCache.set(currentObject.id, data);
        }
        if (data === undefined || data.getSize() === 0) {
          continue;
        }

        let itemLayers: Map<number, string> | undefined;
        if (
          typeof currentObject.layer !== "string" &&
          currentObject.dataSource.table !== undefined
        ) {
          const itemLayersCacheKey = `${currentObject.dataSource.table}:${currentObject.layer.column}`;
          if (itemLayersCache.has(itemLayersCacheKey)) {
            itemLayers = itemLayersCache.get(itemLayersCacheKey);
          } else {
            try {
              const tableData = await loadTable(
                currentObject.dataSource.table,
                { signal },
              );
              signal?.throwIfAborted();
              const tableIds = tableData.getIds();
              const tableLayers = await tableData.loadValues<string>(
                currentObject.layer.column,
                { signal },
              );
              signal?.throwIfAborted();
              itemLayers = new Map(
                tableIds.map((id, i) => [id, tableLayers[i]!]),
              );
            } catch (error) {
              if (!signal?.aborted) {
                console.error(
                  `Failed to load layers from table ${currentObject.dataSource.table}`,
                  error,
                );
              }
            } finally {
              signal?.throwIfAborted();
            }
            itemLayersCache.set(itemLayersCacheKey, itemLayers);
          }
          if (itemLayers === undefined) {
            continue;
          }
        }

        const itemIds = data.getIds();
        let itemMask: boolean[] | undefined;
        let filteredItemIds = itemIds;
        if (itemLayers !== undefined) {
          const newItemMask = new Array<boolean>(itemIds.length);
          const newFilteredItemIds: number[] = [];
          await AsyncUtils.forEach(
            itemIds,
            (id, i) => {
              const include = itemLayers.get(id) === currentLayer.id;
              newItemMask[i] = include;
              if (include) {
                newFilteredItemIds.push(id);
              }
            },
            { signal },
          );
          signal?.throwIfAborted();
          if (newFilteredItemIds.length === 0) {
            continue;
          }
          itemMask = newItemMask;
          filteredItemIds = newFilteredItemIds;
        }

        newRefs.push({
          layer: currentLayer,
          object: currentObject,
          itemMask,
          filteredItemIds,
          data,
        });
      }
    }
    return newRefs;
  }

  /**
   * Gets the bounds of all rendered objects
   *
   * @returns The bounds as a Rect object or undefined if no objects are rendered
   */
  protected getRenderedBounds(): Rect | null {
    return this.renderedObjects.reduce<Rect | null>((union, renderedObject) => {
      const bounds = TransformUtils.transformBoundingBox(
        renderedObject.objectBounds,
        WebGLUtils.createDataToWorldMatrix(
          renderedObject.ref.object,
          renderedObject.ref.layer,
        ),
      );
      return union !== null ? GeometryUtils.boundingBox(union, bounds) : bounds;
    }, null);
  }
}

/**
 * Represents a reference to an object (points or shapes) along with its associated layer, item mask, filtered item IDs, and data
 *
 * @param TObject - The type of the object (Points or Shapes)
 * @param TObjectData - The type of the object data (PointsData or ShapesData)
 */
export type ObjectRef<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  layer: Layer;
  object: TObject;
  itemMask: boolean[] | undefined;
  filteredItemIds: number[];
  data: TObjectData;
};

/**
 * Represents a rendered object along with its associated reference and bounds
 *
 * @param TObject - The type of the object (Points or Shapes)
 * @param TObjectData - The type of the object data (PointsData or ShapesData)
 */
export type RenderedObjectBase<
  TObject extends Points | Shapes,
  TObjectData extends PointsData | ShapesData,
> = {
  ref: ObjectRef<TObject, TObjectData>;
  objectBounds: Rect;
};
