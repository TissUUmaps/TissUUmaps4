import type OpenSeadragon from "openseadragon";

import type { LabelsDataSource } from "../model/labels";
import type { UintArray } from "../types/arrays";
import type {
  CustomTileSource,
  TileSourceConfig,
} from "../types/openseadragon";
import type { ItemsData, ItemsDataProvider } from "./base";

/**
 * Data provider for label images
 *
 * @typeParam TLabelsDataSource - The data source type this data provider opens
 * @typeParam TLabelsData - The {@link LabelsData} type produced by this data
 * provider
 * @typeParam TNormalizedLabelsDataSource - The normalized data source type
 * produced by `normalize` and accepted by `load`
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LabelsDataProvider<
  TLabelsDataSource extends LabelsDataSource,
  TLabelsData extends LabelsData,
  TNormalizedLabelsDataSource extends TLabelsDataSource = TLabelsDataSource,
> extends ItemsDataProvider<
  TLabelsDataSource,
  TLabelsData,
  TNormalizedLabelsDataSource
> {}

/**
 * Loaded label image data providing a tiled, multi-resolution integer raster
 *
 * Each pixel value represents a label (segment) ID.
 */
export interface LabelsData extends ItemsData {
  /**
   * Returns the tile source of this label image
   *
   * @returns The tile source, which can be a URL string, a TileSourceConfig
   * object, or a CustomTileSource object
   */
  getTileSource(): string | TileSourceConfig | CustomTileSource;

  /**
   * Extracts the raw label image data from a tile invalidation event
   *
   * The raster does not need to be cropped to the tile's source bounds: it may
   * cover the full tile size, as the renderer crops it when drawing.
   *
   * @param event - The tile invalidation event
   * @returns The label IDs of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the event does not contain label image data
   */
  getData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: number[] | UintArray; width: number; height: number }>;
}
