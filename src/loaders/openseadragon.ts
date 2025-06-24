import { IImageData, IImageDataLoader } from "../data/image";
import { ICustomTileSource } from "../data/types";
import { IImageDataSourceModel } from "../models/image";

export const OPENSEADRAGON_IMAGE_DATA_SOURCE = "openseadragon";

export interface OpenSeadragonImageDataSourceModel
  extends IImageDataSourceModel<typeof OPENSEADRAGON_IMAGE_DATA_SOURCE> {
  tileSource: string;
}

export class OpenSeadragonImageData implements IImageData {
  private readonly tileSource: string | ICustomTileSource;

  constructor(tileSource: string | ICustomTileSource) {
    this.tileSource = tileSource;
  }

  getTileSource(): string | ICustomTileSource {
    return this.tileSource;
  }
}

export class OpenSeadragonImageDataLoader
  implements
    IImageDataLoader<OpenSeadragonImageDataSourceModel, OpenSeadragonImageData>
{
  private readonly dataSource: OpenSeadragonImageDataSourceModel;
  private readonly projectDir: FileSystemDirectoryHandle | undefined;

  constructor(
    dataSource: OpenSeadragonImageDataSourceModel,
    projectDir?: FileSystemDirectoryHandle,
  ) {
    this.dataSource = dataSource;
    this.projectDir = projectDir;
  }

  getDataSource(): OpenSeadragonImageDataSourceModel {
    return this.dataSource;
  }

  getProjectDir(): FileSystemDirectoryHandle | undefined {
    return this.projectDir;
  }

  loadImage(): Promise<OpenSeadragonImageData> {
    const imageData = new OpenSeadragonImageData(this.dataSource.tileSource);
    return Promise.resolve(imageData);
  }
}
