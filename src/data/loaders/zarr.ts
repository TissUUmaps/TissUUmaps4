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
    throw new Error("Method not implemented."); // TODO
  }

  getTileWidth(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number | undefined {
    throw new Error("Method not implemented."); // TODO
  }

  getTileHeight(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number | undefined {
    throw new Error("Method not implemented."); // TODO
  }

  loadTile(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _x: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _y: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _abortSignal?: AbortSignal,
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
    const store = await this._loadZarr();
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

  private async _loadZarr(): Promise<zarrita.AsyncReadable> {
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
