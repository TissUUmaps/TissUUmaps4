import { ChartScatterIcon } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/project";

import {
  pointSizeFactorToSliderPosition,
  sliderPositionToPointSizeFactor,
} from "./pointSizeSlider";

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
