import GeoTIFF, { GeoTIFFImage, Pool, fromBlob, fromUrl } from "geotiff";

import { ILabelsData, ILabelsDataLoader } from "../data/labels";
import { UintArray } from "../data/types";
import { ILabelsDataSourceModel } from "../models/labels";

// https://github.com/geotiffjs/geotiff.js/issues/445
enum SampleFormat {
  UINT = 1,
  INT = 2,
  FLOAT = 3,
  UNDEFINED = 4,
}

// TODO GeoTIFFImageDataLoader

export const GEOTIFF_LABELS_DATA_SOURCE = "geotiff";

export interface IGeoTIFFLabelsDataSourceModel
  extends ILabelsDataSourceModel<typeof GEOTIFF_LABELS_DATA_SOURCE> {
  tiffFile?: string;
  tiffUrl?: string;
  tileWidth?: number;
  tileHeight?: number;
}

export class GeoTIFFLabelsData implements ILabelsData {
  private static readonly SHARED_POOL = new Pool();

  private readonly images: GeoTIFFImage[];
  private readonly tileWidth?: number;
  private readonly tileHeight?: number;

  constructor(images: GeoTIFFImage[], tileWidth?: number, tileHeight?: number) {
    this.images = images;
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
  implements ILabelsDataLoader<IGeoTIFFLabelsDataSourceModel, GeoTIFFLabelsData>
{
  private readonly dataSource: IGeoTIFFLabelsDataSourceModel;
  private readonly projectDir: FileSystemDirectoryHandle | undefined;

  constructor(
    dataSource: IGeoTIFFLabelsDataSourceModel,
    projectDir?: FileSystemDirectoryHandle,
  ) {
    this.dataSource = dataSource;
    this.projectDir = projectDir;
  }

  getDataSource(): IGeoTIFFLabelsDataSourceModel {
    return this.dataSource;
  }

  getProjectDir(): FileSystemDirectoryHandle | undefined {
    return this.projectDir;
  }

  async loadLabels(abortSignal?: AbortSignal): Promise<GeoTIFFLabelsData> {
    const tiff = await this.loadTIFF(abortSignal);
    const imageCount = await tiff.getImageCount();
    if (imageCount <= 0) {
      throw new Error(
        `No images found in TIFF file: ${this.dataSource.tiffUrl || this.dataSource.tiffFile}`,
      );
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
      images.sort((a, b) => b.getWidth() - a.getWidth()),
      this.dataSource.tileWidth,
      this.dataSource.tileHeight,
    );
  }

  private async loadTIFF(abortSignal?: AbortSignal): Promise<GeoTIFF> {
    if (this.dataSource.tiffUrl !== undefined) {
      return await fromUrl(this.dataSource.tiffUrl, abortSignal);
    }
    if (this.dataSource.tiffFile !== undefined) {
      if (this.projectDir === undefined) {
        throw new Error("Project directory is required to load local files.");
      }
      const fh = await this.projectDir.getFileHandle(this.dataSource.tiffFile);
      const file = await fh.getFile();
      return await fromBlob(file, abortSignal);
    }
    throw new Error("No TIFF source specified (tiffUrl or tiffFile).");
  }
}
