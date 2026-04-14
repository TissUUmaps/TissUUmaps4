import {
  type MultiPolygon,
  type ProgressCallback,
  type ShapesData,
} from "@tissuumaps/core";

export class GeoJSONShapesData implements ShapesData {
  private _ids: number[] | undefined;
  private _names: string[] | undefined;
  private readonly _multiPolygons: MultiPolygon[];

  constructor(
    ids: number[] | undefined,
    names: string[] | undefined,
    multiPolygons: MultiPolygon[],
  ) {
    this._ids = ids;
    this._names = names;
    this._multiPolygons = multiPolygons;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID property specified, using sequential IDs instead");
      this._ids = Array.from({ length: this.getSize() }, (_, i) => i);
    }
    return this._ids;
  }

  getSize(): number {
    return this._multiPolygons.length;
  }

  getNames(): string[] | undefined {
    return this._names;
  }

  loadMultiPolygons(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<MultiPolygon[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  close(): void {}
}
