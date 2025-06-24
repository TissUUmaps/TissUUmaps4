import { IImageData, IImageDataLoader } from "../data/image";
import { ICustomTileSource } from "../data/types";
import { IImageDataSourceModel } from "../models/image";

// TODO Allow for local image files

export const OPENSEADRAGON_IMAGE_DATA_SOURCE = "openseadragon";

export interface IOpenSeadragonImageDataSourceModel
  extends IImageDataSourceModel<typeof OPENSEADRAGON_IMAGE_DATA_SOURCE> {
  tileSource: string;
}

export class OpenSeadragonImageData implements IImageData {
  private readonly tileSource: string | ICustomTileSource;

  constructor(tileSource: string | ICustomTileSource) {
    this.tileSource = tileSource;
  }

  getChannels(): string[] | undefined {
    return undefined;
  }

  getTileSource(): string | ICustomTileSource {
    return this.tileSource;
  }
}

export class OpenSeadragonImageDataLoader
  implements
    IImageDataLoader<IOpenSeadragonImageDataSourceModel, OpenSeadragonImageData>
{
  private readonly dataSource: IOpenSeadragonImageDataSourceModel;

  constructor(dataSource: IOpenSeadragonImageDataSourceModel) {
    this.dataSource = dataSource;
  }

  getDataSource(): IOpenSeadragonImageDataSourceModel {
    return this.dataSource;
  }

  getProjectDir(): FileSystemDirectoryHandle | undefined {
    return undefined;
  }

  loadImage(): Promise<OpenSeadragonImageData> {
    const imageData = new OpenSeadragonImageData(this.dataSource.tileSource);
    return Promise.resolve(imageData);
  }
}
