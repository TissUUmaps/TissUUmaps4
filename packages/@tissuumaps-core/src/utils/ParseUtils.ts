export class ParseUtils {
  static parseFinite(value: unknown): number {
    const v = ParseUtils.tryParseFinite(value);
    if (v === undefined) {
      throw new Error(`Value is not a finite number: ${String(value)}`);
    }
    return v;
  }

  static parseSafeInt(value: unknown): number {
    const v = ParseUtils.tryParseSafeInt(value);
    if (v === undefined) {
      throw new Error(`Value is not a safe integer: ${String(value)}`);
    }
    return v;
  }

  static tryParseFinite(
    value: unknown,
    options?: { requireSafeBigInt?: boolean },
  ): number | undefined {
    let v: number;
    if (typeof value === "number") {
      v = value;
    } else if (typeof value === "bigint") {
      if (value < Number.MIN_SAFE_INTEGER || value > Number.MAX_SAFE_INTEGER) {
        if (options?.requireSafeBigInt) {
          return undefined;
        }
        console.warn(`Value ${value} is outside the safe integer range`);
      }
      v = Number(value);
    } else if (typeof value === "string" && value.trim() !== "") {
      v = Number(value);
    } else {
      return undefined;
    }
    return Number.isFinite(v) ? v : undefined;
  }

  static tryParseSafeInt(value: unknown): number | undefined {
    const v = ParseUtils.tryParseFinite(value, { requireSafeBigInt: true });
    if (v === undefined) {
      return undefined;
    }
    return Number.isSafeInteger(v) ? v : undefined;
  }
}
