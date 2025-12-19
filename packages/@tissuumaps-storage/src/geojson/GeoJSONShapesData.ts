import { type MultiPolygon, type ShapesData } from "@tissuumaps/core";

export class GeoJSONShapesData implements ShapesData {
  private readonly _multiPolygons: MultiPolygon[];

  constructor(multiPolygons: MultiPolygon[]) {
    this._multiPolygons = multiPolygons;
  }

  getLength(): number {
    return this._multiPolygons.length;
  }

  loadMultiPolygons({ signal }: { signal?: AbortSignal } = {}): Promise<
    MultiPolygon[]
  > {
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  destroy(): void {}
}
