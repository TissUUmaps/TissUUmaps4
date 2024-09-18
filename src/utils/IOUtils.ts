export interface ImageProvider {
  getData(): unknown; // TODO define image data type
}

export interface PointsProvider {
  getVariables(): string[];
  getData(variable: string): unknown; // TODO define points data type
}

export interface ShapesProvider {
  getData(): unknown; // TODO define shapes data type
}

export type ImageProviderFactory = (config: unknown) => ImageProvider;
export type PointsProviderFactory = (config: unknown) => PointsProvider;
export type ShapesProviderFactory = (config: unknown) => ShapesProvider;

export default class IOUtils {
  private static imageProviderFactories: Map<string, ImageProviderFactory> =
    new Map();
  private static pointsProviderFactories: Map<string, PointsProviderFactory> =
    new Map();
  private static shapesProviderFactories: Map<string, ShapesProviderFactory> =
    new Map();

  public static registerImageProviderFactory(
    type: string,
    imageProviderFactory: ImageProviderFactory,
  ): void {
    IOUtils.imageProviderFactories.set(type, imageProviderFactory);
  }

  public static registerPointsProviderFactory(
    type: string,
    pointsProviderFactory: PointsProviderFactory,
  ): void {
    IOUtils.pointsProviderFactories.set(type, pointsProviderFactory);
  }

  public static registerShapesProviderFactory(
    type: string,
    shapesProviderFactory: ShapesProviderFactory,
  ): void {
    IOUtils.shapesProviderFactories.set(type, shapesProviderFactory);
  }

  public static getImageProvider(type: string, config: unknown): ImageProvider {
    const imageProviderFactory = IOUtils.imageProviderFactories.get(type)!;
    return imageProviderFactory(config);
  }

  public static getPointsProvider(
    type: string,
    config: unknown,
  ): PointsProvider {
    const pointsProviderFactory = IOUtils.pointsProviderFactories.get(type)!;
    return pointsProviderFactory(config);
  }

  public static getShapesProvider(
    type: string,
    config: unknown,
  ): ShapesProvider {
    const shapesProviderFactory = IOUtils.shapesProviderFactories.get(type)!;
    return shapesProviderFactory(config);
  }
}
