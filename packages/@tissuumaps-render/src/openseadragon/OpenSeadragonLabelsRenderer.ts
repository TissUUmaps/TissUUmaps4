import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  type CustomTileSource,
  type DefaultMap,
  type Labels,
  type LabelsData,
  type Table,
  type TableData,
  type TileSourceConfig,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "@tissuumaps/core";

import { ColorResolver } from "../webgl/resolvers/ColorResolver";
import { OpacityResolver } from "../webgl/resolvers/OpacityResolver";
import { VisibilityResolver } from "../webgl/resolvers/VisibilityResolver";
import type { DataTransfer } from "./OpenSeadragonContext";
import {
  type ObjectRef,
  OpenSeadragonRendererBase,
  type OpenSeadragonSyncContext,
} from "./OpenSeadragonRendererBase";

export type OpenSeadragonLabelsSyncContext = OpenSeadragonSyncContext<
  Labels,
  LabelsData
> & {
  tables: Table[];
  colorMaps: DefaultMap<Color>[];
  visibilityMaps: DefaultMap<boolean>[];
  opacityMaps: DefaultMap<number>[];
  loadTable: (
    table: Table,
    options?: { signal?: AbortSignal },
  ) => Promise<TableData>;
};

/**
 * Renderer for the tiled images of {@link Labels} data objects
 *
 * The tiles of a labels object carry label IDs rather than colors, and are
 * recolored by a data transfer (see
 * {@link OpenSeadragonContext.updateTiledImageDataTransfer}) that looks each
 * ID up in a color lookup table. The table is resolved per object from the
 * label color, visibility and opacity configurations, in the same way as the
 * WebGL renderers resolve the appearance of their items, and folds the
 * visibility and opacity into the alpha channel. Layer and object opacity are
 * not part of it; OpenSeadragon applies them when drawing the tiled image.
 *
 * As data transfers are compared by identity, each object's data transfer is
 * kept (see {@link resolveObjects}) until its data or one of the configurations
 * it was resolved from changes, so that tiles are only recolored when needed.
 */
export class OpenSeadragonLabelsRenderer extends OpenSeadragonRendererBase<
  Labels,
  LabelsData,
  OpenSeadragonLabelsSyncContext
> {
  /** The color of labels that the data does not list, in `ImageData` byte order */
  private static readonly _defaultPixel =
    OpenSeadragonLabelsRenderer._packPixel(
      ColorResolver.encodeColor(defaultLabelColor),
      defaultLabelVisibility
        ? OpacityResolver.encodeOpacity(defaultLabelOpacity)
        : 0,
    );

  private readonly _dataTransfers = new Map<
    string,
    {
      data: LabelsData;
      state: Pick<Labels, "labelColor" | "labelVisibility" | "labelOpacity">;
      dataTransfer: DataTransfer;
    }
  >();

  /**
   * Returns the tile source for the given labels data
   *
   * @param data - The labels data for which to retrieve the tile source
   * @returns The single tile source of the labels data
   */
  protected override getTileSources(
    data: LabelsData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: OpenSeadragonLabelsSyncContext,
  ): (string | TileSourceConfig | CustomTileSource)[] {
    return [data.getTileSource()];
  }

  /**
   * Returns the data transfer resolved for the given labels object
   *
   * @param ref - The labels reference for which to get the data transfer
   * @returns The data transfer resolved by {@link resolveObjects}, or
   * `undefined` if the object has not been resolved
   */
  protected override getTiledImageDataTransfer(
    ref: ObjectRef<Labels, LabelsData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _index: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: OpenSeadragonLabelsSyncContext,
  ): DataTransfer | undefined {
    return this._dataTransfers.get(ref.object.id)?.dataTransfer;
  }

  /**
   * Resolves the data transfer of every labels object, concurrently
   *
   * An object's data transfer is kept as long as its data and its label color,
   * visibility and opacity configurations are unchanged, and is resolved anew
   * otherwise. Data transfers of objects that are not referenced anymore are
   * dropped.
   *
   * @param refs - The loaded labels references
   * @param context - The inputs of the current synchronization
   * @param options - Optional abort signal
   */
  protected override async resolveObjects(
    refs: ObjectRef<Labels, LabelsData>[],
    context: OpenSeadragonLabelsSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    await Promise.all(
      refs.map(async (ref) => {
        const entry = this._dataTransfers.get(ref.object.id);
        if (
          entry !== undefined &&
          entry.data === ref.data &&
          deepEqual(entry.state.labelColor, ref.object.labelColor) &&
          deepEqual(entry.state.labelVisibility, ref.object.labelVisibility) &&
          deepEqual(entry.state.labelOpacity, ref.object.labelOpacity)
        ) {
          return;
        }
        const dataTransfer =
          await OpenSeadragonLabelsRenderer._resolveDataTransfer(ref, context, {
            signal,
          });
        this._dataTransfers.set(ref.object.id, {
          data: ref.data,
          state: {
            labelColor: structuredClone(ref.object.labelColor),
            labelVisibility: structuredClone(ref.object.labelVisibility),
            labelOpacity: structuredClone(ref.object.labelOpacity),
          },
          dataTransfer,
        });
      }),
    );
    for (const objectId of this._dataTransfers.keys()) {
      if (!refs.some((ref) => ref.object.id === objectId)) {
        this._dataTransfers.delete(objectId);
      }
    }
  }

  /**
   * Resolves the data transfer of a labels object
   *
   * Resolves the color, visibility and opacity of every label ID that the data
   * lists, and folds them into a lookup table from ID to packed pixel. Label
   * value `0` is background and maps to a fully transparent pixel; IDs that the
   * data does not list are drawn with the default label color, visibility and
   * opacity.
   *
   * @param ref - The labels reference to resolve
   * @param context - The inputs of the current synchronization
   * @param options - Optional abort signal
   * @returns The resolved data transfer
   */
  private static async _resolveDataTransfer(
    ref: ObjectRef<Labels, LabelsData>,
    context: OpenSeadragonLabelsSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<DataTransfer> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let loadTable;
    const tableId = ref.object.dataSource.table;
    if (tableId !== undefined) {
      const table = context.tables.find((table) => table.id === tableId);
      if (table !== undefined) {
        loadTable = (options?: { signal?: AbortSignal }) =>
          context.loadTable(table, options);
      } else {
        console.warn(`Table with ID ${tableId} not found`);
      }
    }
    const ids = ref.data.getIds();
    const [colors, visibilities, opacities] = await Promise.all([
      ColorResolver.resolveColors(
        ids,
        ref.object.labelColor,
        context.colorMaps,
        defaultLabelColor,
        { signal, loadTable },
      ),
      VisibilityResolver.resolveVisibilities(
        ids,
        ref.object.labelVisibility,
        context.visibilityMaps,
        defaultLabelVisibility,
        { signal, loadTable },
      ),
      OpacityResolver.resolveOpacities(
        ids,
        ref.object.labelOpacity,
        context.opacityMaps,
        defaultLabelOpacity,
        { signal, loadTable },
      ),
    ]);
    const pixels = new Map<number, number>();
    await AsyncUtils.forEach(
      ids,
      (id, i) => {
        const alpha = visibilities[i]! > 0 ? opacities[i]! : 0;
        pixels.set(
          id,
          OpenSeadragonLabelsRenderer._packPixel(colors[i]!, alpha),
        );
      },
      { signal },
    );
    return {
      getData: (event) => ref.data.getData(event),
      transfer: (value) =>
        value === 0
          ? 0
          : (pixels.get(value) ?? OpenSeadragonLabelsRenderer._defaultPixel),
    };
  }

  /**
   * Packs a color and an alpha value into a pixel in `ImageData` byte order
   *
   * @param color - The packed RGB color, as encoded by {@link ColorResolver}
   * @param alpha - The alpha value in `[0, 255]`
   * @returns The pixel, `(a << 24) | (b << 16) | (g << 8) | r` (see
   * {@link DataTransfer})
   */
  private static _packPixel(color: number, alpha: number): number {
    const r = (color >>> 16) & 0xff;
    const g = (color >>> 8) & 0xff;
    const b = color & 0xff;
    return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
}
