import { ZipFileStore } from "@zarrita/storage";
import * as zarrita from "zarrita";

import { ILabelsDataSourceModel } from "../../models/labels";
import { ILabelsData } from "../labels";
import { UintArray } from "../types";
import { LabelsDataLoaderBase } from "./base";

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
  private static readonly _X_AXIS = 1;
  private static readonly _Y_AXIS = 0;

  private readonly _arrays: zarrita.Array<zarrita.DataType>[];

  constructor(arrays: zarrita.Array<zarrita.DataType>[]) {
    this._arrays = arrays;
  }

  getWidth(level?: number): number {
    return this._arrays[level || 0]!.shape[ZarrLabelsData._X_AXIS]!;
  }

  getHeight(level?: number): number {
    return this._arrays[level || 0]!.shape[ZarrLabelsData._Y_AXIS]!;
  }

  getLevelCount(): number {
    return this._arrays.length;
  }

  getLevelScale(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number {
    // TODO getLevelScale
    throw new Error("Method not implemented.");
  }

  getTileWidth(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number | undefined {
    // TODO getTileWidth
    throw new Error("Method not implemented.");
  }

  getTileHeight(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number | undefined {
    // TODO getTileHeight
    throw new Error("Method not implemented.");
  }

  loadTile(
    _level: number,
    _x: number,
    _y: number,
    signal?: AbortSignal,
  ): Promise<UintArray> {
    signal?.throwIfAborted();
    // TODO loadTile
    throw new Error("Method not implemented.");
  }

  destroy(): void {}
}

export class ZarrLabelsDataLoader extends LabelsDataLoaderBase<
  IZarrLabelsDataSourceModel,
  ZarrLabelsData
> {
  async loadLabels(signal?: AbortSignal): Promise<ZarrLabelsData> {
    signal?.throwIfAborted();
    const store = await this._loadZarr(signal);
    signal?.throwIfAborted();
    const root = await zarrita.open(store);
    signal?.throwIfAborted();
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
        signal?.throwIfAborted();
      }
      if (arrays.length === 0) {
        throw new Error("No Zarr levels found.");
      }
    } else {
      const array = await zarrita.open(labelsNode, { kind: "array" });
      signal?.throwIfAborted();
      arrays.push(array);
    }
    return new ZarrLabelsData(arrays);
  }

  private async _loadZarr(
    signal?: AbortSignal,
  ): Promise<zarrita.AsyncReadable> {
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
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
