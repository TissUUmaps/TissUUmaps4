import { IImageData, IImageDataLoader } from "../data/image";
import { IImageDataSourceModel } from "../models/image";

export const OPENSEADRAGON_IMAGE_DATA_SOURCE = "openseadragon";

export interface OpenSeadragonImageDataSourceModel
  extends IImageDataSourceModel<typeof OPENSEADRAGON_IMAGE_DATA_SOURCE> {
  tileSource: string;
}

export class OpenSeadragonImageDataLoader
  implements IImageDataLoader<OpenSeadragonImageDataSourceModel>
{
  loadImage(
    dataSource: OpenSeadragonImageDataSourceModel,
  ): Promise<IImageData> {
    const imageData: IImageData = {
      tileSource: dataSource.tileSource,
    };
    return Promise.resolve(imageData);
  }
}
