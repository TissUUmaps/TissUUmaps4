// workaround for @microsoft/api-extractor not yet supporting ES2025
type Float16Array = typeof globalThis extends {
  Float16Array: { prototype: infer TFloat16ArrayPrototype };
}
  ? TFloat16ArrayPrototype
  : never;

/** Union of signed integer typed arrays */
export type IntArray = Int8Array | Int16Array | Int32Array;

/** Union of unsigned integer typed arrays */
export type UintArray = Uint8Array | Uint16Array | Uint32Array;

/** Union of floating-point typed arrays */
export type FloatArray = Float16Array | Float32Array | Float64Array;

/** Union of all numeric typed arrays */
export type TypedArray = IntArray | UintArray | FloatArray;

/** Union of all array types that can hold numeric values */
export type NumericArray = number[] | TypedArray;

/**
 * The array types that can hold values of type `T`
 *
 * Numbers may be held by a plain array or by any numeric typed array, anything
 * else only by a plain array. For an unconstrained `T`, both are possible.
 */
export type GenericArray<T> = T extends number
  ? NumericArray
  : unknown extends T
    ? NumericArray | T[]
    : T[];
