import type {
  Color,
  CustomTileSource,
  DefaultMap,
  Labels,
  LabelsData,
  Layer,
  TableData,
  TileSourceConfig,
} from "@tissuumaps/core";

import { OpenSeadragonRendererBase } from "./OpenSeadragonRendererBase";

/**
 * Renderer for managing tiled images for {@link Labels} data objects in an OpenSeadragon viewer.
 *
 * This class extends the {@link OpenSeadragonRendererBase} to provide specific functionality for rendering label objects.
 * It handles the synchronization of tiled labels with the current model state, including loading, updating, and removing labels as needed.
 */
export class OpenSeadragonLabelsRenderer extends OpenSeadragonRendererBase<
  Labels,
  LabelsData
> {
  /**
   * Synchronizes the viewer's tiled images with the current model state for labels objects.
   *
   * This method is currently a placeholder and does not implement the actual synchronization logic for labels.
   *
   * @param _layers - Layers to render
   * @param _labels - Labels objects to display
   * @param _colorMaps - Color maps for labels
   * @param _visibilityMaps - Visibility maps for labels
   * @param _opacityMaps - Opacity maps for labels
   * @param _loadLabels - Async getter for labels data
   * @param _loadTable - Async getter for table data
   * @param options - Optional abort signal
   *
   * @todo Implement the logic to synchronize labels objects with their corresponding tiled images in the viewer.
   */
  async synchronize(
    _layers: Layer[],
    _labels: Labels[],
    _colorMaps: DefaultMap<Color>[],
    _visibilityMaps: DefaultMap<boolean>[],
    _opacityMaps: DefaultMap<number>[],
    _loadLabels: (
      labelsId: string,
      options?: {
        signal?: AbortSignal;
      },
    ) => Promise<LabelsData>,
    _loadTable: (
      tableId: string,
      options?: {
        signal?: AbortSignal;
      },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    // TODO implement labels rendering
    return Promise.resolve();
  }

  /**
   * Retrieves the tile source for a given labels data object.
   *
   * This method is called by the renderer to obtain the appropriate tile source for each labels data object, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object.
   *
   * @param _data - The labels data object for which to retrieve the tile source.
   * @returns The tile source, which can be a URL string, a TileSourceConfig object, or a CustomTileSource object.
   *
   * @todo Implement the logic to retrieve the tile source for labels data objects.
   */
  protected getTileSource(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: LabelsData,
  ): string | TileSourceConfig | CustomTileSource {
    throw new Error("Method not implemented.");
  }
}
