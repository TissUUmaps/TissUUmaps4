import {
  RawDataSource,
  RawLayerConfig,
  RawRenderedDataModel,
  createDataSource,
  createLayerConfig,
  createRenderedDataModel,
} from "./base";

/** A 2D raster image */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawImage
  extends RawRenderedDataModel<RawImageDataSource, RawImageLayerConfig> {}

type DefaultedImageKeys = keyof Omit<
  RawImage,
  "id" | "name" | "dataSource" | "layerConfigs"
>;

export type Image = Required<Pick<RawImage, DefaultedImageKeys>> &
  Omit<RawImage, DefaultedImageKeys>;

export function createImage(rawImage: RawImage): Image {
  return {
    ...createRenderedDataModel(rawImage),
    visibility: true,
    opacity: 1,
    ...rawImage,
  };
}

/** A data source for 2D raster images */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawImageDataSource<TType extends string = string>
  extends RawDataSource<TType> {}

type DefaultedImageDataSourceKeys<TType extends string = string> = keyof Omit<
  RawImageDataSource<TType>,
  "type" | "url" | "path"
>;

export type ImageDataSource<TType extends string = string> = Required<
  Pick<RawImageDataSource<TType>, DefaultedImageDataSourceKeys<TType>>
> &
  Omit<RawImageDataSource<TType>, DefaultedImageDataSourceKeys<TType>>;

export function createImageDataSource<TType extends string = string>(
  rawImageDataSource: RawImageDataSource<TType>,
): ImageDataSource<TType> {
  return { ...createDataSource(rawImageDataSource), ...rawImageDataSource };
}

/** A layer-specific display configuration for 2D raster images */
export interface RawImageLayerConfig extends RawLayerConfig {
  /** Layer ID */
  layerId: string;
}

type DefaultedImageLayerConfigKeys = keyof Omit<RawImageLayerConfig, "layerId">;

export type ImageLayerConfig = Required<
  Pick<RawImageLayerConfig, DefaultedImageLayerConfigKeys>
> &
  Omit<RawImageLayerConfig, DefaultedImageLayerConfigKeys>;

export function createImageLayerConfig(
  rawImageLayerConfig: RawImageLayerConfig,
): ImageLayerConfig {
  return {
    ...createLayerConfig(rawImageLayerConfig),
    flip: false,
    transform: {
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
    },
    ...rawImageLayerConfig,
  };
}
