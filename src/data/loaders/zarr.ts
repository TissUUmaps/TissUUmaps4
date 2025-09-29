import { ZipFileStore } from "@zarrita/storage";
import * as zarrita from "zarrita";

import {
  RawLabelsDataSource,
  createLabelsDataSource,
} from "../../models/labels";
import { UintArray } from "../../types";
import { LabelsData } from "../labels";
import { AbstractLabelsDataLoader } from "./base";

// TODO ZarrImageDataLoader

export const ZARR_LABELS_DATA_SOURCE = "zarr";

export interface RawZarrLabelsDataSource
  extends RawLabelsDataSource<typeof ZARR_LABELS_DATA_SOURCE> {
  axes?: { x: number; y: number };
  hasLevels?: boolean;
  fetchStoreOptions?: ConstructorParameters<typeof zarrita.FetchStore>[1];
}

type DefaultedZarrLabelsDataSourceKeys = keyof Omit<
  RawZarrLabelsDataSource,
  "type" | "url" | "path" | "fetchStoreOptions"
>;

export type ZarrLabelsDataSource = Required<
  Pick<RawZarrLabelsDataSource, DefaultedZarrLabelsDataSourceKeys>
> &
  Omit<RawZarrLabelsDataSource, DefaultedZarrLabelsDataSourceKeys>;

export function createZarrLabelsDataSource(
  rawZarrLabelsDataSource: RawZarrLabelsDataSource,
): ZarrLabelsDataSource {
  return {
    axes: { x: 1, y: 0 },
    hasLevels: false,
    ...createLabelsDataSource(rawZarrLabelsDataSource),
    ...rawZarrLabelsDataSource,
  };
}

export class ZarrLabelsDataLoader extends AbstractLabelsDataLoader<
  ZarrLabelsDataSource,
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
    return new ZarrLabelsData(arrays, this.dataSource.axes);
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

export class ZarrLabelsData implements LabelsData {
  private readonly _arrays: zarrita.Array<zarrita.DataType>[];
  private readonly _axes: { x: number; y: number };

  constructor(
    arrays: zarrita.Array<zarrita.DataType>[],
    axes: { x: number; y: number },
  ) {
    this._arrays = arrays;
    this._axes = axes;
  }

  getWidth(level?: number): number {
    return this._arrays[level ?? 0]!.shape[this._axes.x]!;
  }

  getHeight(level?: number): number {
    return this._arrays[level ?? 0]!.shape[this._axes.y]!;
  }

  getLevelCount(): number {
    return this._arrays.length;
  }

  getLevelScale(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number {
    // TODO ZarrLabelsData.getLevelScale
    throw new Error("Method not implemented.");
  }

  getTileWidth(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number | undefined {
    // TODO ZarrLabelsData.getTileWidth
    throw new Error("Method not implemented.");
  }

  getTileHeight(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _level: number,
  ): number | undefined {
    // TODO ZarrLabelsData.getTileHeight
    throw new Error("Method not implemented.");
  }

  loadTile(
    _level: number,
    _x: number,
    _y: number,
    signal?: AbortSignal,
  ): Promise<UintArray> {
    signal?.throwIfAborted();
    // TODO ZarrLabelsData.loadTile
    throw new Error("Method not implemented.");
  }

  destroy(): void {}
}
