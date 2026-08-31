import type {
  Color,
  CustomTileSource,
  DefaultMap,
  Labels,
  LabelsData,
  Layer,
  Table,
  TableData,
  TileSourceConfig,
} from "@tissuumaps/core";

import { OpenSeadragonRendererBase } from "./OpenSeadragonRendererBase";

/**
 * Renderer for the tiled images of {@link Labels} data objects
 */
export class OpenSeadragonLabelsRenderer extends OpenSeadragonRendererBase<
  Labels,
  LabelsData
> {
  /**
   * Synchronizes the viewer's tiled images with the current model state
   *
   * @param _layers - Layers to render
   * @param _labels - Labels objects to display
   * @param _tables - Tables backing the labels' color, visibility and opacity
   * @param _colorMaps - Color maps for labels
   * @param _visibilityMaps - Visibility maps for labels
   * @param _opacityMaps - Opacity maps for labels
   * @param _loadLabels - Async getter for labels data
   * @param _loadTable - Async getter for table data
   * @param _options - Optional abort signal
   *
   * @todo Implement labels rendering; this is a placeholder that renders nothing.
   */
  synchronize(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _layers: Layer[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _labels: Labels[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tables: Table[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _colorMaps: DefaultMap<Color>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _visibilityMaps: DefaultMap<boolean>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _opacityMaps: DefaultMap<number>[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadLabels: (
      labels: Labels,
      options?: { signal?: AbortSignal },
    ) => Promise<LabelsData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: { signal?: AbortSignal },
  ): Promise<void> {
    // TODO implement labels rendering
    return Promise.resolve();
  }

  /**
   * Returns the tile source for the given labels data
   *
   * @todo Implement labels rendering; this always throws.
   */
  protected getTileSource(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: LabelsData,
  ): string | TileSourceConfig | CustomTileSource {
    throw new Error("Method not implemented.");
  }
}
