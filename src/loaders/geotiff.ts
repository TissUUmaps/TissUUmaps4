import { GeoTIFFImage, Pool, fromUrl } from "geotiff";

import { ILabelsData, ILabelsDataLoader } from "../data/labels";
import { UintArray } from "../data/types";
import { ILabelsDataSourceModel } from "../models/labels";

export const GEOTIFF_LABELS_DATA_SOURCE = "geotiff";

// https://github.com/geotiffjs/geotiff.js/issues/445
enum SampleFormat {
  UINT = 1,
  INT = 2,
  FLOAT = 3,
  UNDEFINED = 4,
}

export interface GeoTIFFLabelsDataSourceModel
  extends ILabelsDataSourceModel<typeof GEOTIFF_LABELS_DATA_SOURCE> {
  url: string;
  tileWidth?: number;
  tileHeight?: number;
}

export class GeoTIFFLabelsData implements ILabelsData {
  private static readonly SHARED_POOL = new Pool();

  private readonly images: GeoTIFFImage[];
  private readonly tileWidth?: number;
  private readonly tileHeight?: number;

  constructor(images: GeoTIFFImage[], tileWidth?: number, tileHeight?: number) {
    this.images = images.sort((a, b) => b.getWidth() - a.getWidth());
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  getWidth(level?: number): number {
    return this.images[level || 0].getWidth();
  }

  getHeight(level?: number): number {
    return this.images[level || 0].getHeight();
  }

  getLevelCount(): number {
    return this.images.length;
  }

  getLevelScale(level: number): number {
    return this.images[0].getWidth() / this.images[level].getWidth();
  }

  getTileWidth(level: number): number | undefined {
    return this.tileWidth || this.images[level].getTileWidth();
  }

  getTileHeight(level: number): number | undefined {
    return this.tileHeight || this.images[level].getTileHeight();
  }

  async loadTile(
    level: number,
    x: number,
    y: number,
    abortSignal?: AbortSignal,
  ): Promise<UintArray> {
    const image = this.images[level];
    const sharedPool = GeoTIFFLabelsData.SHARED_POOL;
    const tile = await image.getTileOrStrip(x, y, 0, sharedPool, abortSignal);
    const bitsPerSample = image.getBitsPerSample(0) as number;
    switch (bitsPerSample) {
      case 8:
        return new Uint8Array(tile.data);
      case 16:
        return new Uint16Array(tile.data);
      case 32:
        return new Uint32Array(tile.data);
      default:
        throw new Error(`Unsupported bits per sample: ${bitsPerSample}`);
    }
  }
}

export class GeoTIFFLabelsDataLoader
  implements ILabelsDataLoader<GeoTIFFLabelsDataSourceModel>
{
  async loadLabels(
    dataSource: GeoTIFFLabelsDataSourceModel,
  ): Promise<ILabelsData> {
    const tiff = await fromUrl(dataSource.url);
    const imageCount = await tiff.getImageCount();
    if (imageCount <= 0) {
      throw new Error(`No images found in the TIFF file: ${dataSource.url}`);
    }
    const imagePromises = [];
    for (let i = 0; i < imageCount; i++) {
      const imagePromise = tiff.getImage(i).then((image) => {
        if (image.getSamplesPerPixel() !== 1) {
          throw new Error(
            `Unsupported samples per pixel in image ${i}: ${image.getSamplesPerPixel()}; only single-channel images are supported.`,
          );
        }
        if (image.getSampleFormat(0) !== SampleFormat.UINT) {
          throw new Error(
            `Unsupported sample format in image ${i}: ${SampleFormat[image.getSampleFormat(0) as number]}; only unsigned integer images are supported.`,
          );
        }
        if (![8, 16, 32].includes(image.getBitsPerSample(0) as number)) {
          throw new Error(
            `Unsupported bits per sample in image ${i}: ${image.getBitsPerSample(0)}; only 8, 16, or 32-bit images are supported.`,
          );
        }
        return image;
      });
      imagePromises.push(imagePromise);
    }
    const images = await Promise.all(imagePromises);
    return new GeoTIFFLabelsData(
      images,
      dataSource.tileWidth,
      dataSource.tileHeight,
    );
  }
}
