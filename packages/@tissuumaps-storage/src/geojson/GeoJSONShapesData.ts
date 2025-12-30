import { type MultiPolygon, type ShapesData } from "@tissuumaps/core";

export class GeoJSONShapesData implements ShapesData {
  private readonly _multiPolygons: MultiPolygon[];
  private _index: Uint16Array | number[] | undefined;

  constructor(
    multiPolygons: MultiPolygon[],
    index: Uint16Array | number[] | undefined,
  ) {
    this._multiPolygons = multiPolygons;
    this._index = index;
  }

  getLength(): number {
    return this._multiPolygons.length;
  }

  getIndex(): Uint16Array | number[] {
    if (this._index === undefined) {
      console.warn("No ID property specified, using sequential IDs instead");
      this._index = Array.from(
        { length: this._multiPolygons.length },
        (_, i) => i,
      );
    }
    return this._index;
  }

  loadMultiPolygons({ signal }: { signal?: AbortSignal } = {}): Promise<
    MultiPolygon[]
  > {
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  destroy(): void {}
}
