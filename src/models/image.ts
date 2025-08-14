import {
  IDataSourceModel,
  ILayerConfigModel,
  IRenderedDataModel,
} from "./base";

/** A 2D raster image */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IImageModel
  extends IRenderedDataModel<IImageDataSourceModel, IImageLayerConfigModel> {}

/** A data source for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IImageDataSourceModel<TType extends string = string>
  extends IDataSourceModel<TType> {}

/** A layer-specific display configuration for 2D raster images */
export interface IImageLayerConfigModel extends ILayerConfigModel {
  /** Layer ID */
  layerId: string;
}
