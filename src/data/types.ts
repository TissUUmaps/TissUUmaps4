export type TileSourceConfig = object;

export interface ICustomTileSource {
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}

export type IntArray = Int8Array | Int16Array | Int32Array | BigInt64Array;
export type UintArray = Uint8Array | Uint16Array | Uint32Array | BigUint64Array;
export type FloatArray = Float32Array | Float64Array;
export type TypedArray = IntArray | UintArray | FloatArray;

export type GeoJSONGeometry = object;
