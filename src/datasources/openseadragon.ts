import { ImageDataSourceModel } from "../models/image";
import { ImageDataSourceBase, TileSourceSpec } from "./base";

export const OPENSEADRAGON_IMAGE_DATA_SOURCE = "openseadragon";

export class OpenSeadragonImageDataSource
  implements ImageDataSourceBase<OpenSeadragonImageDataSourceModel>
{
  private config: OpenSeadragonImageDataSourceModel;

  constructor(config: OpenSeadragonImageDataSourceModel) {
    this.config = config;
  }

  getConfig(): OpenSeadragonImageDataSourceModel {
    return this.config;
  }

  getImage(): TileSourceSpec {
    return structuredClone(this.config.tileSource);
  }
}

export interface OpenSeadragonImageDataSourceModel
  extends ImageDataSourceModel<typeof OPENSEADRAGON_IMAGE_DATA_SOURCE> {
  tileSource: TileSourceSpec;
}
