import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  ColorUtils,
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

import { ColorResolver } from "../resolvers/ColorResolver";
import { OpacityResolver } from "../resolvers/OpacityResolver";
import { VisibilityResolver } from "../resolvers/VisibilityResolver";
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
 * kept (see {@link resolveObject}) until its data or one of the configurations
 * it was resolved from changes, so that tiles are only recolored when needed.
 */
export class OpenSeadragonLabelsRenderer extends OpenSeadragonRendererBase<
  Labels,
  LabelsData,
  OpenSeadragonLabelsSyncContext
> {
  private static readonly _defaultPixelValue = ColorUtils.packRGBA(
    ColorResolver.encodeColor(defaultLabelColor),
    VisibilityResolver.encodeVisibility(defaultLabelVisibility),
    OpacityResolver.encodeOpacity(defaultLabelOpacity),
  );

  private readonly _renderedLabels = new Map<
    string,
    {
      data: LabelsData;
      state: Pick<Labels, "labelColor" | "labelVisibility" | "labelOpacity">;
      dataTransfer: DataTransfer;
    }
  >();

  /**
   * Drops the data transfers of all labels objects other than the given ones
   *
   * @param labels - The labels objects about to be displayed
   */
  protected override retainObjects(labels: Labels[]): void {
    for (const labelsId of this._renderedLabels.keys()) {
      if (!labels.some((currentLabels) => currentLabels.id === labelsId)) {
        this._renderedLabels.delete(labelsId);
      }
    }
  }

  /**
   * Resolves the data transfer of a labels object, unless it is up to date
   *
   * An object's data transfer is kept as long as its data and its label color,
   * visibility and opacity configurations are unchanged, and is resolved anew
   * otherwise (see {@link _resolveDataTransfer}). If resolving fails, the
   * previous entry stays in place.
   *
   * @todo Changes to the color, visibility and opacity maps themselves are not
   * detected; they are only re-read when a configuration referencing them
   * changes.
   *
   * @param labels - The labels object to resolve
   * @param data - The loaded data of the labels object
   * @param context - The inputs of the current synchronization
   * @param options - Optional abort signal
   * @returns A promise that resolves once the data transfer has been resolved
   */
  protected override async resolveObject(
    labels: Labels,
    data: LabelsData,
    context: OpenSeadragonLabelsSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const renderedLabels = this._renderedLabels.get(labels.id);
    if (
      renderedLabels === undefined ||
      renderedLabels.data !== data ||
      !deepEqual(renderedLabels.state.labelColor, labels.labelColor) ||
      !deepEqual(
        renderedLabels.state.labelVisibility,
        labels.labelVisibility,
      ) ||
      !deepEqual(renderedLabels.state.labelOpacity, labels.labelOpacity)
    ) {
      this._renderedLabels.set(labels.id, {
        data,
        state: {
          labelColor: structuredClone(labels.labelColor),
          labelVisibility: structuredClone(labels.labelVisibility),
          labelOpacity: structuredClone(labels.labelOpacity),
        },
        dataTransfer: await OpenSeadragonLabelsRenderer._resolveDataTransfer(
          labels,
          data,
          context,
          options,
        ),
      });
    }
  }

  /**
   * Returns the tile source for the given labels data
   *
   * @param data - The labels data for which to retrieve the tile source
   * @returns The single tile source of the labels data
   */
  protected override getTileSources(
    data: LabelsData,
  ): (string | TileSourceConfig | CustomTileSource)[] {
    return [data.getTileSource()];
  }

  /**
   * Returns the data transfer resolved for the given labels object
   *
   * A labels object has a single tiled image, whose tiles carry the label IDs,
   * and no backdrop, so the index is not looked at.
   *
   * @param ref - The labels reference for which to get the data transfer
   * @returns The data transfer resolved by {@link resolveObject}, or
   * `undefined` if the object has not been resolved
   */
  protected override getTiledImageDataTransfer(
    ref: ObjectRef<Labels, LabelsData>,
  ): DataTransfer | undefined {
    const renderedLabels = this._renderedLabels.get(ref.object.id);
    if (renderedLabels !== undefined) {
      return renderedLabels.dataTransfer;
    }
    return undefined;
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
   * @param labels - The labels object to resolve
   * @param data - The loaded data of the labels object
   * @param context - The inputs of the current synchronization
   * @param options - Optional abort signal
   * @returns The resolved data transfer
   */
  private static async _resolveDataTransfer(
    labels: Labels,
    data: LabelsData,
    context: OpenSeadragonLabelsSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<DataTransfer> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let loadTable;
    const tableId = labels.dataSource.table;
    if (tableId !== undefined) {
      const table = context.tables.find((table) => table.id === tableId);
      if (table !== undefined) {
        loadTable = (options?: { signal?: AbortSignal }) =>
          context.loadTable(table, options);
      } else {
        console.warn(`Table with ID ${tableId} not found`);
      }
    }
    const labelIds = data.getIds();
    const [labelColors, labelVisibilities, labelOpacities] = await Promise.all([
      ColorResolver.resolveColors(
        labelIds,
        labels.labelColor,
        context.colorMaps,
        defaultLabelColor,
        { signal, loadTable },
      ),
      VisibilityResolver.resolveVisibilities(
        labelIds,
        labels.labelVisibility,
        context.visibilityMaps,
        defaultLabelVisibility,
        { signal, loadTable },
      ),
      OpacityResolver.resolveOpacities(
        labelIds,
        labels.labelOpacity,
        context.opacityMaps,
        defaultLabelOpacity,
        { signal, loadTable },
      ),
    ]);
    const labelPixelValues = new Map<number, number>();
    await AsyncUtils.forEach(
      labelIds,
      (labelId, i) => {
        labelPixelValues.set(
          labelId,
          ColorUtils.packRGBA(
            labelColors[i]!,
            labelVisibilities[i]!,
            labelOpacities[i]!,
          ),
        );
      },
      { signal },
    );
    return {
      getData: (event) => data.getData(event),
      transfer: (values, pixelBuffer) => {
        for (let i = 0; i < values.length; i++) {
          const labelId = values[i]!;
          pixelBuffer[i] =
            labelId === 0
              ? 0
              : (labelPixelValues.get(labelId) ??
                OpenSeadragonLabelsRenderer._defaultPixelValue);
        }
      },
    };
  }
}
