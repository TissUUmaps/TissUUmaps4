import { type MultiPolygon, type ShapesData } from "@tissuumaps/core";

export class GeoJSONShapesData implements ShapesData {
  private readonly _multiPolygons: MultiPolygon[];
  private _ids?: number[];

  constructor(multiPolygons: MultiPolygon[], ids?: number[]) {
    this._multiPolygons = multiPolygons;
    this._ids = ids;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID property specified, using sequential IDs instead");
      this._ids = Array.from(
        { length: this._multiPolygons.length },
        (_, i) => i,
      );
    }
    return this._ids;
  }

  getSize(): number {
    return this._multiPolygons.length;
  }

  loadMultiPolygons(options?: {
    signal?: AbortSignal;
  }): Promise<MultiPolygon[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  close(): void {}
}
