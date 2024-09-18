export type ImageData = {
  name: string;
  tileSource: unknown;
};

export interface ImageProvider {
  getData(): ImageData;
}

export type ImageProviderConfig = unknown;

export type ImageProviderFactory = (
  config: ImageProviderConfig,
) => ImageProvider;

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;
export type PointsData = { [variable: string]: TypedArray | string[] };

export interface PointsProvider {
  getVariables(): string[];
  getData(variable: string): PointsData;
}

export type PointsProviderConfig = unknown;

export type PointsProviderFactory = (
  config: PointsProviderConfig,
) => PointsProvider;

type GeoJSON = object;
export type ShapesData = GeoJSON;

export interface ShapesProvider {
  getData(): ShapesData;
}

export type ShapesProviderConfig = unknown;

export type ShapesProviderFactory = (
  config: ShapesProviderConfig,
) => ShapesProvider;

export default class IOUtils {
  private static imageProviderFactories: Map<string, ImageProviderFactory> =
    new Map();
  private static pointsProviderFactories: Map<string, PointsProviderFactory> =
    new Map();
  private static shapesProviderFactories: Map<string, ShapesProviderFactory> =
    new Map();

  static registerImageProviderFactory(
    type: string,
    factory: ImageProviderFactory,
  ): void {
    if (IOUtils.imageProviderFactories.has(type)) {
      console.warn(`Image provider already registered: ${type}; replacing`);
    }
    IOUtils.imageProviderFactories.set(type, factory);
  }

  static registerPointsProviderFactory(
    type: string,
    factory: PointsProviderFactory,
  ): void {
    if (IOUtils.pointsProviderFactories.has(type)) {
      console.warn(`Points provider already registered: ${type}; replacing`);
    }
    IOUtils.pointsProviderFactories.set(type, factory);
  }

  static registerShapesProviderFactory(
    type: string,
    factory: ShapesProviderFactory,
  ): void {
    if (IOUtils.shapesProviderFactories.has(type)) {
      console.warn(`Shapes provider already registered: ${type}; replacing`);
    }
    IOUtils.shapesProviderFactories.set(type, factory);
  }

  static getImageProvider(
    type: string,
    config: ImageProviderConfig,
  ): ImageProvider {
    const factory = IOUtils.imageProviderFactories.get(type);
    if (!factory) {
      throw new Error(`Image provider not supported: ${type}`);
    }
    return factory(config);
  }

  static getPointsProvider(
    type: string,
    config: PointsProviderConfig,
  ): PointsProvider {
    const factory = IOUtils.pointsProviderFactories.get(type);
    if (!factory) {
      throw new Error(`Points provider not supported: ${type}`);
    }
    return factory(config);
  }

  static getShapesProvider(
    type: string,
    config: ShapesProviderConfig,
  ): ShapesProvider {
    const factory = IOUtils.shapesProviderFactories.get(type);
    if (!factory) {
      throw new Error(`Shapes provider not supported: ${type}`);
    }
    return factory(config);
  }
}
