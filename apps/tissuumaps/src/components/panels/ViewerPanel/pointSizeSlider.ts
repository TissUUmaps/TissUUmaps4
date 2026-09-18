import { MathUtils } from "@tissuumaps/core";

const minPointSizeFactor = 0.01;
const maxPointSizeFactor = 5;
const zeroZoneWidth = 0.05; // positions in [-1, -1 + zeroZoneWidth) map to 0
const snapZoneWidth = 0.1; // positions in [-snapZoneWidth, snapZoneWidth] map to 1

// Log-linear segments on either side of the snap zone, as [min, max] ranges
const lowerPositions: [number, number] = [-1 + zeroZoneWidth, -snapZoneWidth];
const lowerDecades: [number, number] = [Math.log10(minPointSizeFactor), 0];
const upperPositions: [number, number] = [snapZoneWidth, 1];
const upperDecades: [number, number] = [0, Math.log10(maxPointSizeFactor)];

/**
 * Maps a slider position in [-1, 1] to a point size factor.
 *
 * The far left is 0, the centre snaps to 1, and each side scales
 * logarithmically up to the minimum and maximum factor.
 */
export function sliderPositionToPointSizeFactor(position: number): number {
  if (position < lowerPositions[0]) {
    return 0;
  }
  if (Math.abs(position) <= snapZoneWidth) {
    return 1;
  }
  const decades =
    position < 0
      ? MathUtils.remap(position, lowerPositions, lowerDecades)
      : MathUtils.remap(position, upperPositions, upperDecades);
  return Math.round(1000 * 10 ** decades) / 1000;
}

/** Inverse of {@link sliderPositionToPointSizeFactor}, clamped to the slider range. */
export function pointSizeFactorToSliderPosition(
  pointSizeFactor: number,
): number {
  if (pointSizeFactor <= 0) {
    return -1;
  }
  const decades = Math.log10(
    MathUtils.clamp(pointSizeFactor, minPointSizeFactor, maxPointSizeFactor),
  );
  if (decades === 0) {
    return 0;
  }
  return decades < 0
    ? MathUtils.remap(decades, lowerDecades, lowerPositions)
    : MathUtils.remap(decades, upperDecades, upperPositions);
}
