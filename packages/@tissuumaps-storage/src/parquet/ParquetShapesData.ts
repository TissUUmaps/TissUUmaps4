import type { ShapesData, ShapesGeometry } from "@tissuumaps/core";

/** Shapes data of a GeoParquet file, fully loaded up front */
export class ParquetShapesData implements ShapesData {
  private readonly _geometry: ShapesGeometry;
  private readonly _ids: number[];
  private readonly _names: string[] | undefined;

  constructor(
    geometry: ShapesGeometry,
    ids: number[],
    names: string[] | undefined,
  ) {
    if (ids.length !== geometry.shapePolygonOffsets.length - 1) {
      throw new Error("Shapes geometry and IDs have inconsistent sizes");
    }
    this._geometry = geometry;
    this._ids = ids;
    this._names = names;
  }

  getIds(): number[] {
    return this._ids;
  }

  getSize(): number {
    return this._geometry.shapePolygonOffsets.length - 1;
  }

  getNames(): string[] | undefined {
    return this._names;
  }

  loadGeometry(): Promise<ShapesGeometry> {
    return Promise.resolve(this._geometry);
  }

  close(): void {}
}
