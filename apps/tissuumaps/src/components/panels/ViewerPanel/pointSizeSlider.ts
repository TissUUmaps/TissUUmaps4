import { MathUtils } from "@tissuumaps/core";

const minPointSizePercentage = 1;
const maxPointSizePercentage = 500;
const zeroSliderPositionRange = 0.05;
const snapSliderPositionRange = 0.1;

const decadesBelowHundred = Math.log10(100 / minPointSizePercentage);
const decadesAboveHundred = Math.log10(maxPointSizePercentage / 100);
const sliderPositionRangeBelowHundred =
  1 - zeroSliderPositionRange - snapSliderPositionRange;
const sliderPositionRangeAboveHundred = 1 - snapSliderPositionRange;

/**
 * Maps a slider position in [-1, 1] to a point size factor.
 *
 * The far left is 0, the centre snaps to 1, and each side scales
 * logarithmically up to the minimum and maximum percentage.
 */
export function sliderPositionToPointSizeFactor(position: number): number {
  if (position < -1 + zeroSliderPositionRange) {
    return 0;
  }
  if (Math.abs(position) <= snapSliderPositionRange) {
    return 1;
  }
  const decadeRange = position < 0 ? decadesBelowHundred : decadesAboveHundred;
  const positionRange =
    position < 0
      ? sliderPositionRangeBelowHundred
      : sliderPositionRangeAboveHundred;
  const decades =
    Math.sign(position) *
    ((Math.abs(position) - snapSliderPositionRange) / positionRange) *
    decadeRange;
  return Math.round(1000 * 10 ** decades) / 1000;
}

/** Inverse of {@link sliderPositionToPointSizeFactor}, clamped to the slider range. */
export function pointSizeFactorToSliderPosition(
  pointSizeFactor: number,
): number {
  if (pointSizeFactor <= 0) {
    return -1;
  }
  const percentage = MathUtils.clamp(
    pointSizeFactor * 100,
    minPointSizePercentage,
    maxPointSizePercentage,
  );
  const decades = Math.log10(percentage / 100);
  if (decades === 0) {
    return 0;
  }
  const decadeRange = decades < 0 ? decadesBelowHundred : decadesAboveHundred;
  const positionRange =
    decades < 0
      ? sliderPositionRangeBelowHundred
      : sliderPositionRangeAboveHundred;
  return (
    Math.sign(decades) *
    (snapSliderPositionRange +
      (Math.abs(decades) / decadeRange) * positionRange)
  );
}
