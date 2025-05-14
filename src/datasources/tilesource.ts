import { ImageDataSourceModel } from "../models/image";
import { ImageDataSource, TileSourceSpec, TypedArray } from "./base";

export const TILESOURCE_IMAGE_DATA_SOURCE = "tilesource";

export class TileSourceImageDataSource implements ImageDataSource {
  private config: TileSourceImageDataSourceOptions;

  constructor(config: TileSourceImageDataSourceOptions) {
    this.config = config;
  }

  getValuesColumns(): string[] {
    return [];
  }

  getGroupsColumns(): string[] {
    return [];
  }

  loadColumn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _col: string,
  ): Promise<TypedArray> {
    throw new Error("Method not supported.");
  }

  getImage(): TileSourceSpec {
    return structuredClone(this.config.tileSource);
  }
}

export interface TileSourceImageDataSourceOptions
  extends ImageDataSourceModel<typeof TILESOURCE_IMAGE_DATA_SOURCE> {
  tileSource: TileSourceSpec;
}
