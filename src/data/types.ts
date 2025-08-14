export type TileSourceConfig = object;

export interface ICustomTileSource {
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}

export type IntArray = Int8Array | Int16Array | Int32Array;
export type UintArray = Uint8Array | Uint16Array | Uint32Array;
export type FloatArray = Float16Array | Float32Array | Float64Array;
export type TypedArray = IntArray | UintArray | FloatArray;
export type MappableArrayLike<T> = ArrayLike<T> & {
  map<U>(
    callbackFn: (element: T, index: number, array: MappableArrayLike<T>) => U,
    thisArg?: unknown,
  ): MappableArrayLike<U>;
};

export type GeoJSONGeometry = object;
