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

  it("when min equals max returns that value", () => {
    expect(MathUtils.clamp(2, 5, 5)).toBe(5);
    expect(MathUtils.clamp(7, 5, 5)).toBe(5);
  });

  it("when min > max returns max (per implementation)", () => {
    // Math.min(Math.max(min, value), max) will return max in this case
    expect(MathUtils.clamp(3, 10, 5)).toBe(5);
    expect(MathUtils.clamp(20, 10, 5)).toBe(5);
  });
});

describe("MathUtils bitwise safe operations (uint32 results)", () => {
  it("safeAnd with positive and negative yields expected uint32", () => {
    const a = -1;
    const b = 0x0f0f0f0f; // 252645135
    expect(MathUtils.safeAnd(a, b)).toBe(0x0f0f0f0f >>> 0);
    expect(MathUtils.safeAnd(3.7, 1.2)).toBe((3 & 1) >>> 0); // float inputs truncated
  });

  it("safeOr produces expected uint32", () => {
    const a = 0x80000000; // 2147483648
    const b = 1;
    expect(MathUtils.safeOr(a, b)).toBe((0x80000000 | 1) >>> 0);
    expect(MathUtils.safeOr(-2, 2)).toBe((-2 | 2) >>> 0);
  });

  it("safeXor produces expected uint32", () => {
    const a = 0xffffffff; // -1 as int32
    const b = 0xaaaaaaaa;
    expect(MathUtils.safeXor(a, b)).toBe((0xffffffff ^ 0xaaaaaaaa) >>> 0);
  });

  it("safeNot produces expected uint32", () => {
    expect(MathUtils.safeNot(0)).toBe(~0 >>> 0); // should be 0xFFFFFFFF
    expect(MathUtils.safeNot(0x12345678)).toBe(~0x12345678 >>> 0);
  });

  it("safeLeftShift respects 32-bit shift semantics", () => {
    expect(MathUtils.safeLeftShift(1, 31)).toBe((1 << 31) >>> 0);
    // shift of 32 is treated as shift & 31 => 0, so value unchanged
    expect(MathUtils.safeLeftShift(1, 32)).toBe((1 << 0) >>> 0);
    // overflow behavior
    expect(MathUtils.safeLeftShift(0x80000000, 1)).toBe(
      (0x80000000 << 1) >>> 0,
    );
  });

  it("safeRightShift behaves as unsigned right shift", () => {
    expect(MathUtils.safeRightShift(0x80000000, 1)).toBe(
      (0x80000000 >>> 1) >>> 0,
    );
    expect(MathUtils.safeRightShift(1, 1)).toBe(0);
    // shift of 32 treated as 0
    expect(MathUtils.safeRightShift(1, 32)).toBe(1);
  });
});
