import { TypedArray } from "../data/types";

export default class ArrayUtils {
  static fillSeq<T extends TypedArray>(arr: T, seq: number[]): void {
    if (arr.length < seq.length || arr.length % seq.length !== 0) {
      throw new Error("Array length must be a multiple of sequence length");
    }
    for (let i = 0; i < seq.length; i++) {
      arr[i] = seq[i]!;
    }
    let offset = seq.length;
    while (offset < arr.length) {
      arr.set(arr.subarray(0, arr.length), offset);
      offset += arr.length;
    }
  }
}
