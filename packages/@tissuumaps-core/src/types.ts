export type IntArray = Int8Array | Int16Array | Int32Array;
export type UintArray = Uint8Array | Uint16Array | Uint32Array;
export type FloatArray = Float32Array | Float64Array; // Float16Array will be part of ECMAScript 2025
export type TypedArray = IntArray | UintArray | FloatArray;
export type MappableArrayLike<T> = ArrayLike<T> & {
  map<U>(
    callbackFn: (element: T, index: number, array: MappableArrayLike<T>) => U,
    thisArg?: unknown,
  ): MappableArrayLike<U>;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type MultiPolygon = {
  polygons: Polygon[];
};
export type Polygon = {
  shell: Path;
  holes: Path[];
};
export type Path = Vertex[];
export type Vertex = { x: number; y: number };
