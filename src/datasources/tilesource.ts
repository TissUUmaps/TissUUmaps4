import { ImageSourceModel } from "../models/image";
import { ImageSourceBase, TileSourceSpec } from "./base";

export const TILESOURCE_SOURCE = "tilesource";

export class TileSourceSource
  implements ImageSourceBase<TileSourceSourceModel>
{
  private config: TileSourceSourceModel;

  constructor(config: TileSourceSourceModel) {
    this.config = config;
  }

  getConfig(): TileSourceSourceModel {
    return this.config;
  }

  getImage(): TileSourceSpec {
    return structuredClone(this.config.tileSource);
  }
}

export interface TileSourceSourceModel
  extends ImageSourceModel<typeof TILESOURCE_SOURCE> {
  tileSource: TileSourceSpec;
}
