import { describe, expect, it } from "vitest";

import { MathUtils } from "./MathUtils";

describe("MathUtils.clamp", () => {
  it("returns value when within range", () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to min when value is below min", () => {
    expect(MathUtils.clamp(-3, 0, 10)).toBe(0);
  });

  it("clamps to max when value is above max", () => {
    expect(MathUtils.clamp(15, 0, 10)).toBe(10);
  });

  it("works with floats", () => {
    expect(MathUtils.clamp(3.7, 1.2, 4.5)).toBeCloseTo(3.7);
    expect(MathUtils.clamp(0.5, 1.2, 4.5)).toBeCloseTo(1.2);
  });

  it("returns the value when min equals max", () => {
    expect(MathUtils.clamp(2, 5, 5)).toBe(5);
    expect(MathUtils.clamp(7, 5, 5)).toBe(5);
  });
});

describe("MathUtils bitwise safe operations", () => {
  it("safeAnd with positive and negative values", () => {
    expect(MathUtils.safeAnd(-1, 0x0f0f0f0f)).toBe(0x0f0f0f0f >>> 0);
    expect(MathUtils.safeAnd(0xff00, 0x0ff0)).toBe(0x0f00);
  });

  it("safeOr produces expected uint32", () => {
    expect(MathUtils.safeOr(0x80000000, 1)).toBe((0x80000000 | 1) >>> 0);
    expect(MathUtils.safeOr(0xff00, 0x00ff)).toBe(0xffff);
  });

  it("safeXor produces expected uint32", () => {
    expect(MathUtils.safeXor(0xffffffff, 0xaaaaaaaa)).toBe(
      (0xffffffff ^ 0xaaaaaaaa) >>> 0,
    );
  });

  it("safeXor with zero is identity", () => {
    expect(MathUtils.safeXor(0x12345678, 0)).toBe(0x12345678);
  });

  it("safeNot produces expected uint32", () => {
    expect(MathUtils.safeNot(0)).toBe(0xffffffff);
    expect(MathUtils.safeNot(0x12345678)).toBe(~0x12345678 >>> 0);
  });

  it("safeLeftShift respects 32-bit shift semantics", () => {
    expect(MathUtils.safeLeftShift(1, 31)).toBe((1 << 31) >>> 0);
    expect(MathUtils.safeLeftShift(1, 32)).toBe((1 << 0) >>> 0);
    expect(MathUtils.safeLeftShift(0x80000000, 1)).toBe(
      (0x80000000 << 1) >>> 0,
    );
  });

  it("safeRightShift behaves as unsigned right shift", () => {
    expect(MathUtils.safeRightShift(0x80000000, 1)).toBe(0x40000000);
    expect(MathUtils.safeRightShift(1, 1)).toBe(0);
    expect(MathUtils.safeRightShift(1, 32)).toBe(1);
  });

  it("all safe operations return non-negative values", () => {
    const ops = [
      MathUtils.safeAnd(-1, -1),
      MathUtils.safeOr(-1, 0),
      MathUtils.safeXor(-1, 0),
      MathUtils.safeNot(-1),
      MathUtils.safeLeftShift(-1, 1),
      MathUtils.safeRightShift(-1, 1),
    ];
    for (const result of ops) {
      expect(result).toBeGreaterThanOrEqual(0);
    }
  });
});
