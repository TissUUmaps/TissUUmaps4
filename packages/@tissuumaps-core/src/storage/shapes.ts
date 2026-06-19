import { type ShapesDataSource } from "../model/shapes";
import { type ProgressCallback, type ShapesGeometry } from "../types";
import { type ItemsData, type ItemsDataProvider } from "./base";

/**
 * Data provider for shape (polygon) collections
 *
 * @typeParam TShapesData - The concrete {@link ShapesData} type produced by this data provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesDataProvider<
  TShapesDataSource extends ShapesDataSource,
  TShapesData extends ShapesData,
> extends ItemsDataProvider<TShapesDataSource, TShapesData> {}

/**
 * Loaded shape collection data providing geometry access
 */
export interface ShapesData extends ItemsData {
  /**
   * Loads the geometry for all shapes
   *
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the loaded shapes geometry
   */
  loadGeometry(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<ShapesGeometry>;
}
