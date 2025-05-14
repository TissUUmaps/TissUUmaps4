import {
  DataDataSourceModel,
  DataModel,
  StaticDataLayerConfigModel,
} from "./base";

/** A 2D raster image */
export interface ImageModel
  extends DataModel<ImageDataSourceModel<string>, ImageLayerConfigModel> {
  /** Physical pixel size, applied before any transformation (defaults to 1) */
  pixelSize?: number;
}

/** A data source for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageDataSourceModel<T extends string>
  extends DataDataSourceModel<T> {}

/** A layer-specific display configuration for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageLayerConfigModel extends StaticDataLayerConfigModel {}
