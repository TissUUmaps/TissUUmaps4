import { describe, expect, it } from "vitest";

import {
  pointSizeFactorToSliderPosition,
  sliderPositionToPointSizeFactor,
} from "./pointSizeSlider";

describe("sliderPositionToPointSizeFactor", () => {
  it("maps the fixed points", () => {
    expect(sliderPositionToPointSizeFactor(-1)).toBe(0);
    expect(sliderPositionToPointSizeFactor(-0.95)).toBeCloseTo(0.01);
    expect(sliderPositionToPointSizeFactor(-0.1)).toBe(1);
    expect(sliderPositionToPointSizeFactor(0)).toBe(1);
    expect(sliderPositionToPointSizeFactor(0.1)).toBe(1);
    expect(sliderPositionToPointSizeFactor(1)).toBeCloseTo(5);
  });

  it("is monotonic", () => {
    let previous = -1;
    for (let position = -1; position <= 1; position += 0.01) {
      const factor = sliderPositionToPointSizeFactor(position);
      expect(factor).toBeGreaterThanOrEqual(previous);
      previous = factor;
    }
  });
});

describe("pointSizeFactorToSliderPosition", () => {
  it("maps the fixed points", () => {
    expect(pointSizeFactorToSliderPosition(0)).toBe(-1);
    expect(pointSizeFactorToSliderPosition(0.01)).toBeCloseTo(-0.95);
    expect(pointSizeFactorToSliderPosition(1)).toBe(0);
    expect(pointSizeFactorToSliderPosition(5)).toBeCloseTo(1);
  });

  it("clamps out-of-range factors", () => {
    expect(pointSizeFactorToSliderPosition(0.001)).toBeCloseTo(-0.95);
    expect(pointSizeFactorToSliderPosition(50)).toBeCloseTo(1);
  });

  it("round-trips outside the snap zones", () => {
    for (const position of [-0.9, -0.5, -0.2, 0.2, 0.5, 0.9]) {
      expect(
        pointSizeFactorToSliderPosition(
          sliderPositionToPointSizeFactor(position),
        ),
      ).toBeCloseTo(position);
    }
  });
});
