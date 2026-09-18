import { ChartScatterIcon } from "lucide-react";

import { MathUtils } from "@tissuumaps/core";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/project";

const minPointSizeFactor = 0.01;
const maxPointSizeFactor = 5;
const zeroZoneWidth = 0.05; // positions in [-1, -1 + zeroZoneWidth) map to 0
const snapZoneWidth = 0.1; // positions in [-snapZoneWidth, snapZoneWidth] map to 1

// Log-linear segments on either side of the snap zone, as [min, max] ranges
const lowerPositions: [number, number] = [-1 + zeroZoneWidth, -snapZoneWidth];
const lowerDecades: [number, number] = [Math.log10(minPointSizeFactor), 0];
const upperPositions: [number, number] = [snapZoneWidth, 1];
const upperDecades: [number, number] = [0, Math.log10(maxPointSizeFactor)];

// Maps a slider position in [-1, 1] to a point size factor: the far left is 0,
// the centre snaps to 1, and each side scales logarithmically to its end.
function sliderPositionToPointSizeFactor(position: number): number {
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

// Inverse of sliderPositionToPointSizeFactor, clamped to the slider range.
function pointSizeFactorToSliderPosition(pointSizeFactor: number): number {
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

const pointSizeFormat = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0,
});

export type PointSizeViewerControlProps = { className?: string };

export function PointSizeViewerControl({
  className,
}: PointSizeViewerControlProps) {
  const glOptions = useProjectStore((state) => state.glOptions);
  const setGLOptions = useProjectStore((state) => state.setGLOptions);

  const { globalPointSizeFactor } = glOptions.pointsRenderOptions;

  return (
    <div
      className={cn(
        "m-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-lg",
        className,
      )}
    >
      <ChartScatterIcon className="size-4 shrink-0 text-muted-foreground" />
      <Slider
        className="w-32"
        aria-label="Global point size"
        min={-1}
        max={1}
        step={0.01}
        value={pointSizeFactorToSliderPosition(globalPointSizeFactor)}
        onValueChange={(value) => {
          setGLOptions({
            ...glOptions,
            pointsRenderOptions: {
              ...glOptions.pointsRenderOptions,
              globalPointSizeFactor: sliderPositionToPointSizeFactor(value),
            },
          });
        }}
      />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {pointSizeFormat.format(globalPointSizeFactor)}
      </span>
    </div>
  );
}
