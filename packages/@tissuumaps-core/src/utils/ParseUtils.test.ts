import { afterEach, describe, expect, it, vi } from "vitest";

import { ParseUtils } from "./ParseUtils";

describe("ParserUtils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("tryParseFinite", () => {
    it("returns finite numbers as-is", () => {
      expect(ParseUtils.tryParseFinite(0)).toBe(0);
      expect(ParseUtils.tryParseFinite(42)).toBe(42);
      expect(ParseUtils.tryParseFinite(-3.14)).toBe(-3.14);
    });

    it("returns undefined for non-finite numbers", () => {
      expect(ParseUtils.tryParseFinite(NaN)).toBeUndefined();
      expect(ParseUtils.tryParseFinite(Infinity)).toBeUndefined();
      expect(ParseUtils.tryParseFinite(-Infinity)).toBeUndefined();
    });

    it("parses numeric strings", () => {
      expect(ParseUtils.tryParseFinite("42")).toBe(42);
      expect(ParseUtils.tryParseFinite("-3.14")).toBe(-3.14);
      expect(ParseUtils.tryParseFinite("  7  ")).toBe(7);
      expect(ParseUtils.tryParseFinite("1e3")).toBe(1000);
    });

    it("returns undefined for empty or whitespace-only strings", () => {
      expect(ParseUtils.tryParseFinite("")).toBeUndefined();
      expect(ParseUtils.tryParseFinite("   ")).toBeUndefined();
    });

    it("returns undefined for non-numeric strings", () => {
      expect(ParseUtils.tryParseFinite("abc")).toBeUndefined();
      expect(ParseUtils.tryParseFinite("12px")).toBeUndefined();
    });

    it("returns undefined for non-number, non-string, non-bigint values", () => {
      expect(ParseUtils.tryParseFinite(undefined)).toBeUndefined();
      expect(ParseUtils.tryParseFinite(null)).toBeUndefined();
      expect(ParseUtils.tryParseFinite(true)).toBeUndefined();
      expect(ParseUtils.tryParseFinite({})).toBeUndefined();
      expect(ParseUtils.tryParseFinite([])).toBeUndefined();
    });

    it("parses bigints within the safe integer range", () => {
      expect(ParseUtils.tryParseFinite(42n)).toBe(42);
      expect(ParseUtils.tryParseFinite(-7n)).toBe(-7);
      expect(ParseUtils.tryParseFinite(BigInt(Number.MAX_SAFE_INTEGER))).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    });

    it("warns but still parses out-of-range bigints by default", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const big = BigInt(Number.MAX_SAFE_INTEGER) + 10n;
      expect(ParseUtils.tryParseFinite(big)).toBe(Number(big));
      expect(warn).toHaveBeenCalledOnce();
    });

    it("returns undefined for out-of-range bigints when requireSafeBigInt is set", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const big = BigInt(Number.MAX_SAFE_INTEGER) + 10n;
      expect(
        ParseUtils.tryParseFinite(big, { requireSafeBigInt: true }),
      ).toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn for in-range bigints", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      ParseUtils.tryParseFinite(42n);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("parseFinite", () => {
    it("returns the parsed finite number", () => {
      expect(ParseUtils.parseFinite("3.5")).toBe(3.5);
      expect(ParseUtils.parseFinite(10)).toBe(10);
    });

    it("throws for non-finite values", () => {
      expect(() => ParseUtils.parseFinite("abc")).toThrow(
        "Value is not a finite number: abc",
      );
      expect(() => ParseUtils.parseFinite(NaN)).toThrow(
        "Value is not a finite number",
      );
      expect(() => ParseUtils.parseFinite(undefined)).toThrow(
        "Value is not a finite number",
      );
    });
  });

  describe("tryParseSafeInt", () => {
    it("returns safe integers", () => {
      expect(ParseUtils.tryParseSafeInt(0)).toBe(0);
      expect(ParseUtils.tryParseSafeInt(42)).toBe(42);
      expect(ParseUtils.tryParseSafeInt("-7")).toBe(-7);
      expect(ParseUtils.tryParseSafeInt(42n)).toBe(42);
    });

    it("returns undefined for non-integer finite numbers", () => {
      expect(ParseUtils.tryParseSafeInt(3.14)).toBeUndefined();
      expect(ParseUtils.tryParseSafeInt("2.5")).toBeUndefined();
    });

    it("returns undefined for unsafe integers", () => {
      expect(
        ParseUtils.tryParseSafeInt(Number.MAX_SAFE_INTEGER + 1),
      ).toBeUndefined();
    });

    it("returns undefined for out-of-range bigints without warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const big = BigInt(Number.MAX_SAFE_INTEGER) + 10n;
      expect(ParseUtils.tryParseSafeInt(big)).toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
    });

    it("returns undefined for non-parsable values", () => {
      expect(ParseUtils.tryParseSafeInt("abc")).toBeUndefined();
      expect(ParseUtils.tryParseSafeInt(null)).toBeUndefined();
      expect(ParseUtils.tryParseSafeInt(NaN)).toBeUndefined();
    });
  });

  describe("parseSafeInt", () => {
    it("returns the parsed safe integer", () => {
      expect(ParseUtils.parseSafeInt("42")).toBe(42);
      expect(ParseUtils.parseSafeInt(-7)).toBe(-7);
    });

    it("throws for non-safe-integer values", () => {
      expect(() => ParseUtils.parseSafeInt(3.14)).toThrow(
        "Value is not a safe integer: 3.14",
      );
      expect(() => ParseUtils.parseSafeInt("abc")).toThrow(
        "Value is not a safe integer",
      );
    });
  });
});
