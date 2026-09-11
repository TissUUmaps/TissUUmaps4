import { ChartScatterIcon } from "lucide-react";

import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/project";

const minPointSizePercentage = 1;
const maxPointSizePercentage = 500;
const zeroSliderPositionRange = 0.05;
const snapSliderPositionRange = 0.1;

const decadesBelowHundred = Math.log10(100 / minPointSizePercentage);
const decadesAboveHundred = Math.log10(maxPointSizePercentage / 100);
const sliderPositionRangeBelowHundred =
  1 - zeroSliderPositionRange - snapSliderPositionRange;
const sliderPositionRangeAboveHundred = 1 - snapSliderPositionRange;

const pointSizeFormat = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0,
});

function sliderPositionToPointSizeFactor(position: number) {
  if (position < -1 + zeroSliderPositionRange) {
    return 0;
  }
  if (Math.abs(position) <= snapSliderPositionRange) {
    return 1;
  }
  const decades =
    position < 0
      ? ((position + snapSliderPositionRange) /
          sliderPositionRangeBelowHundred) *
        decadesBelowHundred
      : ((position - snapSliderPositionRange) /
          sliderPositionRangeAboveHundred) *
        decadesAboveHundred;
  return Math.round(100 * 10 ** decades) / 100;
}

function pointSizeFactorToSliderPosition(pointSizeFactor: number) {
  if (pointSizeFactor <= 0) {
    return -1;
  }
  const percentage = Math.min(
    Math.max(pointSizeFactor * 100, minPointSizePercentage),
    maxPointSizePercentage,
  );
  const decades = Math.log10(percentage / 100);
  if (decades === 0) {
    return 0;
  }
  if (decades < 0) {
    return -(
      snapSliderPositionRange +
      (-decades / decadesBelowHundred) * sliderPositionRangeBelowHundred
    );
  }
  return (
    snapSliderPositionRange +
    (decades / decadesAboveHundred) * sliderPositionRangeAboveHundred
  );
}

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
        min={-1}
        max={1}
        step={0.001}
        value={pointSizeFactorToSliderPosition(globalPointSizeFactor)}
        onValueChange={(value) => {
          setGLOptions({
            ...glOptions,
            pointsRenderOptions: {
              ...glOptions.pointsRenderOptions,
              globalPointSizeFactor: sliderPositionToPointSizeFactor(
                value as number,
              ),
            },
          });
        }}
      >
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
          </SliderTrack>
          <SliderThumb aria-label="Global point size" />
        </SliderControl>
      </Slider>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {pointSizeFormat.format(globalPointSizeFactor)}
      </span>
    </div>
  );
}
