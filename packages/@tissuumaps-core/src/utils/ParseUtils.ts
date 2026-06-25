export class ParseUtils {
  static parseFinite(value: unknown): number {
    const finite = ParseUtils.tryParseFinite(value);
    if (finite === undefined) {
      throw new Error(`Value is not a finite number: ${String(value)}`);
    }
    return finite;
  }

  static parseSafeInt(value: unknown): number {
    const safeInt = ParseUtils.tryParseSafeInt(value);
    if (safeInt === undefined) {
      throw new Error(`Value is not a safe integer: ${String(value)}`);
    }
    return safeInt;
  }

  static tryParseFinite(
    value: unknown,
    options?: { requireSafeBigInt?: boolean },
  ): number | undefined {
    let number;
    if (typeof value === "number") {
      number = value;
    } else if (typeof value === "bigint") {
      if (value < Number.MIN_SAFE_INTEGER || value > Number.MAX_SAFE_INTEGER) {
        if (options?.requireSafeBigInt) {
          return undefined;
        }
        console.warn(`Value ${value} is outside the safe integer range`);
      }
      number = Number(value);
    } else if (typeof value === "string" && value.trim() !== "") {
      number = Number(value);
    } else {
      return undefined;
    }
    return Number.isFinite(number) ? number : undefined;
  }

  static tryParseSafeInt(value: unknown): number | undefined {
    const v = ParseUtils.tryParseFinite(value, { requireSafeBigInt: true });
    if (v === undefined) {
      return undefined;
    }
    return Number.isSafeInteger(v) ? v : undefined;
  }
}
