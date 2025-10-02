import * as geotiff from "geotiff";

import {
  LabelsDataSource,
  LabelsDataSourceKeysWithDefaults,
  completeLabelsDataSource,
} from "../../model/labels";
import { UintArray } from "../../types";
import { LabelsData } from "../labels";
import { AbstractLabelsDataLoader } from "./base";

// TODO TIFFImageDataLoader

// https://github.com/geotiffjs/geotiff.js/issues/445
enum SampleFormat {
  UINT = 1,
  INT = 2,
  FLOAT = 3,
  UNDEFINED = 4,
}

const pool = new geotiff.Pool();

export const TIFF_LABELS_DATA_SOURCE = "tiff";

export interface TIFFLabelsDataSource
  extends LabelsDataSource<typeof TIFF_LABELS_DATA_SOURCE> {
  tileWidth?: number;
  tileHeight?: number;
}

export type TIFFLabelsDataSourceKeysWithDefaults =
  LabelsDataSourceKeysWithDefaults<typeof TIFF_LABELS_DATA_SOURCE>;

export type CompleteTIFFLabelsDataSource = Required<
  Pick<TIFFLabelsDataSource, TIFFLabelsDataSourceKeysWithDefaults>
> &
  Omit<TIFFLabelsDataSource, TIFFLabelsDataSourceKeysWithDefaults>;

export function completeTIFFLabelsDataSource(
  tiffLabelsDataSource: TIFFLabelsDataSource,
): CompleteTIFFLabelsDataSource {
  return {
    ...completeLabelsDataSource(tiffLabelsDataSource),
    ...tiffLabelsDataSource,
  };
}

export class TIFFLabelsDataLoader extends AbstractLabelsDataLoader<
  CompleteTIFFLabelsDataSource,
  TIFFLabelsData
> {
  async loadLabels(signal?: AbortSignal): Promise<TIFFLabelsData> {
    signal?.throwIfAborted();
    const tiff = await this._loadTIFF(signal);
    signal?.throwIfAborted();
    const imageCount = await tiff.getImageCount();
    signal?.throwIfAborted();
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
    signal?.throwIfAborted();
    return new TIFFLabelsData(
      images.sort((a, b) => b.getWidth() - a.getWidth()),
      this.dataSource.tileWidth,
      this.dataSource.tileHeight,
    );
  }

  private async _loadTIFF(signal?: AbortSignal): Promise<geotiff.GeoTIFF> {
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const tiff = await geotiff.fromBlob(file, signal);
      signal?.throwIfAborted();
      return tiff;
    }
    if (this.dataSource.url !== undefined) {
      const tiff = await geotiff.fromUrl(this.dataSource.url, signal);
      signal?.throwIfAborted();
      return tiff;
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}

export class TIFFLabelsData implements LabelsData {
  private readonly _levels: geotiff.GeoTIFFImage[];
  private readonly _tileWidth?: number;
  private readonly _tileHeight?: number;

  constructor(
    levels: geotiff.GeoTIFFImage[],
    tileWidth?: number,
    tileHeight?: number,
  ) {
    this._levels = levels;
    this._tileWidth = tileWidth;
    this._tileHeight = tileHeight;
  }

  getWidth(level?: number): number {
    return this._levels[level ?? 0]!.getWidth();
  }

  getHeight(level?: number): number {
    return this._levels[level ?? 0]!.getHeight();
  }

  getLevelCount(): number {
    return this._levels.length;
  }

  getLevelScale(level: number): number {
    return this._levels[0]!.getWidth() / this._levels[level]!.getWidth();
  }

  getTileWidth(level: number): number | undefined {
    return this._tileWidth ?? this._levels[level]!.getTileWidth();
  }

  getTileHeight(level: number): number | undefined {
    return this._tileHeight ?? this._levels[level]!.getTileHeight();
  }

  async loadTile(
    level: number,
    x: number,
    y: number,
    signal?: AbortSignal,
  ): Promise<UintArray> {
    signal?.throwIfAborted();
    const image = this._levels[level]!;
    const tile = await image.getTileOrStrip(x, y, 0, pool, signal);
    signal?.throwIfAborted();
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
