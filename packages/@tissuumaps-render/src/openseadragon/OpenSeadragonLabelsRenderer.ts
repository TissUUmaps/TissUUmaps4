import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  type CustomTileSource,
  type DefaultMap,
  type Labels,
  type LabelsData,
  type Layer,
  MathUtils,
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
 * kept (see {@link _updateRenderedLabels}) until its data or one of the
 * configurations it was resolved from changes, so that tiles are only recolored
 * when needed.
 */
export class OpenSeadragonLabelsRenderer extends OpenSeadragonRendererBase<
  Labels,
  LabelsData,
  OpenSeadragonLabelsSyncContext
> {
  private static readonly _defaultPixelValue =
    VisibilityResolver.encodeVisibility(defaultLabelVisibility) > 0
      ? MathUtils.safeOr(
          ColorResolver.encodeColor(defaultLabelColor) & 0x00ffffff,
          MathUtils.safeLeftShift(
            OpacityResolver.encodeOpacity(defaultLabelOpacity),
            24,
          ),
        )
      : 0;

  private readonly _renderedLabels = new Map<
    string,
    {
      data: LabelsData;
      state: Pick<Labels, "labelColor" | "labelVisibility" | "labelOpacity">;
      dataTransfer: DataTransfer;
    }
  >();

  /**
   * Synchronizes the viewer's tiled images with the current model state
   *
   * Resolves the data transfer of each labels object along with its data (see
   * {@link _updateRenderedLabels}), by wrapping the context's `loadObject`, and
   * drops the data transfers of objects that are gone. Objects whose data
   * transfer cannot be resolved are logged and skipped, like objects whose data
   * failed to load; the logged error names the resolution as the cause, so
   * that it is not mistaken for a failed data load.
   *
   * @param layers - Layers to render
   * @param labels - Labels objects to display
   * @param context - The inputs to synchronize with
   * @param options - Optional abort signal
   */
  override synchronize(
    layers: Layer[],
    labels: Labels[],
    context: OpenSeadragonLabelsSyncContext,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    for (const labelsId of this._renderedLabels.keys()) {
      if (!labels.some((currentLabels) => currentLabels.id === labelsId)) {
        this._renderedLabels.delete(labelsId);
      }
    }
    return super.synchronize(
      layers,
      labels,
      {
        ...context,
        loadObject: async (currentLabels, opts) => {
          const { signal } = opts ?? {};
          signal?.throwIfAborted();
          const data = await context.loadObject(currentLabels, { signal });
          try {
            await this._updateRenderedLabels(currentLabels, data, context, {
              signal,
            });
          } catch (error) {
            if (!signal?.aborted) {
              throw new Error("Failed to resolve data transfer", {
                cause: error,
              });
            }
            throw error;
          }
          return data;
        },
      },
      options,
    );
  }

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
   * A labels object has a single tiled image, whose tiles carry the label IDs,
   * and no backdrop, so the index is not looked at.
   *
   * @param ref - The labels reference for which to get the data transfer
   * @returns The data transfer resolved by {@link _updateRenderedLabels}, or
   * `undefined` if the object has not been resolved
   */
  protected override getTiledImageDataTransfer(
    ref: ObjectRef<Labels, LabelsData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _index: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: OpenSeadragonLabelsSyncContext,
  ): DataTransfer | undefined {
    const renderedLabels = this._renderedLabels.get(ref.object.id);
    if (renderedLabels !== undefined) {
      return renderedLabels.dataTransfer;
    }
    return undefined;
  }

  /**
   * Resolves the data transfer of a labels object, unless it is up to date
   *
   * Called by {@link synchronize} once the object's data has loaded, and
   * concurrently for different objects. An object's data transfer is kept as
   * long as its data and its label color, visibility and opacity configurations
   * are unchanged, and is resolved anew otherwise (see
   * {@link _resolveDataTransfer}). If resolving fails, the previous entry stays
   * in place.
   *
   * @param labels - The labels object
   * @param data - The loaded data of the labels object
   * @param context - The inputs of the current synchronization
   * @param options - Optional abort signal
   */
  private async _updateRenderedLabels(
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
        let pixelValue = labelColors[i]!;
        if (labelVisibilities[i]! > 0) {
          pixelValue = MathUtils.safeOr(
            pixelValue & 0x00ffffff,
            MathUtils.safeLeftShift(labelOpacities[i]!, 24),
          );
        }
        labelPixelValues.set(labelId, pixelValue);
      },
      { signal },
    );
    return {
      getData: (event) => data.getData(event),
      transfer: (values, buffer) => {
        for (let i = 0; i < values.length; i++) {
          const labelId = values[i]!;
          buffer[i] =
            labelId === 0
              ? 0
              : (labelPixelValues.get(labelId) ??
                OpenSeadragonLabelsRenderer._defaultPixelValue);
        }
      },
    };
  }
}
