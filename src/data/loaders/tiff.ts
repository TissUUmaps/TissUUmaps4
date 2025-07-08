import * as geotiff from "geotiff";

import { ILabelsDataSourceModel } from "../../models/labels";
import { ILabelsData } from "../labels";
import { UintArray } from "../types";
import { LabelsDataLoaderBase } from "./base";

const POOL = new geotiff.Pool();

// https://github.com/geotiffjs/geotiff.js/issues/445
enum SampleFormat {
  UINT = 1,
  INT = 2,
  FLOAT = 3,
  UNDEFINED = 4,
}

// TODO TIFFImageDataLoader

export const TIFF_LABELS_DATA_SOURCE = "tiff";

export interface ITIFFLabelsDataSourceModel
  extends ILabelsDataSourceModel<typeof TIFF_LABELS_DATA_SOURCE> {
  tileWidth?: number;
  tileHeight?: number;
}

export class TIFFLabelsData implements ILabelsData {
  private readonly levels: geotiff.GeoTIFFImage[];
  private readonly tileWidth: number | null;
  private readonly tileHeight: number | null;

  constructor(
    levels: geotiff.GeoTIFFImage[],
    tileWidth: number | null,
    tileHeight: number | null,
  ) {
    this.levels = levels;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  getWidth(level?: number): number {
    return this.levels[level || 0].getWidth();
  }

  getHeight(level?: number): number {
    return this.levels[level || 0].getHeight();
  }

  getLevelCount(): number {
    return this.levels.length;
  }

  getLevelScale(level: number): number {
    return this.levels[0].getWidth() / this.levels[level].getWidth();
  }

  getTileWidth(level: number): number | undefined {
    return this.tileWidth || this.levels[level].getTileWidth();
  }

  getTileHeight(level: number): number | undefined {
    return this.tileHeight || this.levels[level].getTileHeight();
  }

  async loadTile(
    level: number,
    x: number,
    y: number,
    abortSignal?: AbortSignal,
  ): Promise<UintArray> {
    const image = this.levels[level];
    const tile = await image.getTileOrStrip(x, y, 0, POOL, abortSignal);
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

  destroy(): void {}
}

export class TIFFLabelsDataLoader extends LabelsDataLoaderBase<
  ITIFFLabelsDataSourceModel,
  TIFFLabelsData
> {
  async loadLabels(abortSignal?: AbortSignal): Promise<TIFFLabelsData> {
    const tiff = await this.loadTIFFFile(abortSignal);
    const imageCount = await tiff.getImageCount();
    if (imageCount <= 0) {
      throw new Error("No images found in the TIFF file.");
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
    return new TIFFLabelsData(
      images.sort((a, b) => b.getWidth() - a.getWidth()),
      this.dataSource.tileWidth ?? null,
      this.dataSource.tileHeight ?? null,
    );
  }

  private async loadTIFFFile(
    abortSignal?: AbortSignal,
  ): Promise<geotiff.GeoTIFF> {
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      return await geotiff.fromBlob(file, abortSignal);
    }
    if (this.dataSource.url !== undefined) {
      return await geotiff.fromUrl(this.dataSource.url, abortSignal);
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}
