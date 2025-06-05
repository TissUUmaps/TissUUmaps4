import {
  PixelsLayerConfigModelBase,
  PixelsModelBase,
  PixelsSourceModelBase,
} from "./base";

/** A 2D raster image */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageModel
  extends PixelsModelBase<ImageSourceModel<string>, ImageLayerConfigModel> {}

/** A data source for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageSourceModel<T extends string>
  extends PixelsSourceModelBase<T> {}

/** A layer-specific display configuration for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageLayerConfigModel extends PixelsLayerConfigModelBase {}
