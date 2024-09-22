export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export default interface PointsReader {
  getVariables(): string[];
  read(variable: string): Promise<TypedArray>;
}

export interface PointsReaderOptions<T extends string> {
  type: T;
}
