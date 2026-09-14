import { describe, expect, it } from "vitest";

import { BitUtils } from "./BitUtils";

describe("BitUtils", () => {
  it("safeAnd with positive and negative values", () => {
    expect(BitUtils.safeAnd(-1, 0x0f0f0f0f)).toBe(0x0f0f0f0f >>> 0);
    expect(BitUtils.safeAnd(0xff00, 0x0ff0)).toBe(0x0f00);
  });

  it("safeOr produces expected uint32", () => {
    expect(BitUtils.safeOr(0x80000000, 1)).toBe((0x80000000 | 1) >>> 0);
    expect(BitUtils.safeOr(0xff00, 0x00ff)).toBe(0xffff);
  });

  it("safeXor produces expected uint32", () => {
    expect(BitUtils.safeXor(0xffffffff, 0xaaaaaaaa)).toBe(
      (0xffffffff ^ 0xaaaaaaaa) >>> 0,
    );
  });

  it("safeXor with zero is identity", () => {
    expect(BitUtils.safeXor(0x12345678, 0)).toBe(0x12345678);
  });

  it("safeNot produces expected uint32", () => {
    expect(BitUtils.safeNot(0)).toBe(0xffffffff);
    expect(BitUtils.safeNot(0x12345678)).toBe(~0x12345678 >>> 0);
  });

  it("safeLeftShift respects 32-bit shift semantics", () => {
    expect(BitUtils.safeLeftShift(1, 31)).toBe((1 << 31) >>> 0);
    expect(BitUtils.safeLeftShift(1, 32)).toBe((1 << 0) >>> 0);
    expect(BitUtils.safeLeftShift(0x80000000, 1)).toBe((0x80000000 << 1) >>> 0);
  });

  it("safeRightShift behaves as unsigned right shift", () => {
    expect(BitUtils.safeRightShift(0x80000000, 1)).toBe(0x40000000);
    expect(BitUtils.safeRightShift(1, 1)).toBe(0);
    expect(BitUtils.safeRightShift(1, 32)).toBe(1);
  });

  it("all safe operations return non-negative values", () => {
    const results = [
      BitUtils.safeAnd(-1, -1),
      BitUtils.safeOr(-1, 0),
      BitUtils.safeXor(-1, 0),
      BitUtils.safeNot(-1),
      BitUtils.safeLeftShift(-1, 1),
      BitUtils.safeRightShift(-1, 1),
    ];
    for (const result of results) {
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });
});
