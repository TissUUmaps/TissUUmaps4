import {
  PixelsDataSourceModelBase,
  PixelsLayerConfigModelBase,
  PixelsModelBase,
} from "./base";

/** A 2D raster image */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageModel
  extends PixelsModelBase<
    ImageDataSourceModel<string>,
    ImageLayerConfigModel
  > {}

/** A data source for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageDataSourceModel<T extends string>
  extends PixelsDataSourceModelBase<T> {}

/** A layer-specific display configuration for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageLayerConfigModel extends PixelsLayerConfigModelBase {}
