/* eslint-disable @typescript-eslint/no-unused-vars */
import { ZipFileStore } from "@zarrita/storage";
import * as zarrita from "zarrita";

import { ILabelsData, LabelsDataLoaderBase } from "../data/labels";
import { UintArray } from "../data/types";
import { ILabelsDataSourceModel } from "../models/labels";

// TODO ZarrImageDataLoader

export const ZARR_LABELS_DATA_SOURCE = "zarr";

export interface IZarrLabelsDataSourceModel
  extends ILabelsDataSourceModel<typeof ZARR_LABELS_DATA_SOURCE> {
  zarrPath?: string;
  hasLevels?: boolean;
  fetchStoreOptions?: {
    overrides?: RequestInit;
    useSuffixRequest?: boolean;
  };
}

export class ZarrLabelsData implements ILabelsData {
  private static readonly X_AXIS = 1;
  private static readonly Y_AXIS = 0;

  private readonly arrays: zarrita.Array<zarrita.DataType>[];

  constructor(arrays: zarrita.Array<zarrita.DataType>[]) {
    this.arrays = arrays;
  }

  getWidth(level?: number): number {
    return this.arrays[level || 0].shape[ZarrLabelsData.X_AXIS];
  }

  getHeight(level?: number): number {
    return this.arrays[level || 0].shape[ZarrLabelsData.Y_AXIS];
  }

  getLevelCount(): number {
    return this.arrays.length;
  }

  getLevelScale(level: number): number {
    throw new Error("Method not implemented."); // TODO
  }

  getTileWidth(level: number): number | undefined {
    throw new Error("Method not implemented."); // TODO
  }

  getTileHeight(level: number): number | undefined {
    throw new Error("Method not implemented."); // TODO
  }

  loadTile(
    level: number,
    x: number,
    y: number,
    abortSignal?: AbortSignal,
  ): Promise<UintArray> {
    throw new Error("Method not implemented."); // TODO
  }

  destroy(): void {}
}

export class ZarrLabelsDataLoader extends LabelsDataLoaderBase<
  IZarrLabelsDataSourceModel,
  ZarrLabelsData
> {
  async loadLabels(): Promise<ZarrLabelsData> {
    const store = await this.loadZarr();
    const root = await zarrita.open(store);
    let labelsNode: zarrita.Location<zarrita.Readable> = root;
    if (this.dataSource.path !== undefined) {
      labelsNode = labelsNode.resolve(this.dataSource.path);
    }
    const arrays = [];
    if (this.dataSource.hasLevels) {
      for (let level = 0; ; level++) {
        const levelNode = labelsNode.resolve(`${level}`);
        try {
          const array = await zarrita.open(levelNode, { kind: "array" });
          arrays.push(array);
        } catch {
          break; // no more levels available
        }
      }
      if (arrays.length === 0) {
        throw new Error("No Zarr levels found.");
      }
    } else {
      const array = await zarrita.open(labelsNode, { kind: "array" });
      arrays.push(array);
    }
    return new ZarrLabelsData(arrays);
  }

  private async loadZarr(): Promise<zarrita.AsyncReadable> {
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      return ZipFileStore.fromBlob(file);
    }
    if (this.dataSource.url !== undefined) {
      return new zarrita.FetchStore(
        this.dataSource.url,
        this.dataSource.fetchStoreOptions,
      );
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}
