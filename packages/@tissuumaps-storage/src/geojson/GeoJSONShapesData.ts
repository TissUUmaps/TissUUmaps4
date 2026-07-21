import type {
  ProgressCallback,
  ShapesData,
  ShapesGeometry,
} from "@tissuumaps/core";

export class GeoJSONShapesData implements ShapesData {
  private readonly _geometry: ShapesGeometry;
  private _ids: number[] | undefined;
  private readonly _names: string[] | undefined;

  constructor(
    geometry: ShapesGeometry,
    ids: number[] | undefined,
    names: string[] | undefined,
  ) {
    this._geometry = geometry;
    this._ids = ids;
    this._names = names;
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

  async loadGeometry(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<ShapesGeometry> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return Promise.resolve(this._geometry);
  }

  close(): void {}
}
