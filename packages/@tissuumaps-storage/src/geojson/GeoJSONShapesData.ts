import {
  type ProgressCallback,
  type ShapesData,
  type ShapesGeometry,
} from "@tissuumaps/core";

export class GeoJSONShapesData implements ShapesData {
  private _ids: number[] | undefined;
  private _names: string[] | undefined;
  private readonly _geometry: ShapesGeometry;

  constructor(
    ids: number[] | undefined,
    names: string[] | undefined,
    geometry: ShapesGeometry,
  ) {
    this._ids = ids;
    this._names = names;
    this._geometry = geometry;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID property specified, using sequential IDs instead");
      this._ids = Array.from({ length: this.getSize() }, (_, i) => i);
    }
    return this._ids;
  }

  getSize(): number {
    return this._geometry.shapePolygonOffsets.length - 1;
  }

  getNames(): string[] | undefined {
    return this._names;
  }

  loadGeometry(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<ShapesGeometry> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return Promise.resolve(this._geometry);
  }

  close(): void {}
}
