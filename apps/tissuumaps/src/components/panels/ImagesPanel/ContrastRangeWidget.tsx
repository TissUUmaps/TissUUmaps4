import {
  ChevronsLeftRightIcon,
  ChevronsRightLeftIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { type ChannelHistogram, MathUtils } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type ContrastRangeWidgetProps = {
  contrastLimits: [number, number];
  onContrastLimitsChange: (contrastLimits: [number, number]) => void;
  onReset?: () => void;
  histogram?: ChannelHistogram;
  dataTypeRange?: [number, number];
  className?: string;
};

/** The number of steps the slider divides its range into */
const sliderStepCount = 1000;

/** The number of bars the histogram is drawn with */
const histogramBarCount = 128;

/** The drawn height of the histogram, in SVG units */
const histogramHeight = 40;

/** The narrowest integer range that the slider still steps in whole values */
const minWholeSpan = 10;

export function ContrastRangeWidget({
  contrastLimits,
  onContrastLimitsChange,
  onReset,
  histogram,
  dataTypeRange,
  className,
}: ContrastRangeWidgetProps) {
  const [min, max] = contrastLimits;
  // a span derived from the current limits would shrink with every drag
  const [initialContrastLimits] = useState(contrastLimits);
  const valuesRange =
    histogram?.range ?? dataTypeRange ?? initialContrastLimits;
  const canExpand =
    dataTypeRange !== undefined &&
    (dataTypeRange[0] < valuesRange[0] || dataTypeRange[1] > valuesRange[1]);
  const [expanded, setExpanded] = useState(
    () => canExpand && (min < valuesRange[0] || max > valuesRange[1]),
  );
  const isExpanded = expanded && canExpand;
  const [spanMin, spanMax] = isExpanded ? dataTypeRange : valuesRange;
  const rangeMin = Math.min(min, spanMin);
  const rangeMax = Math.max(max, spanMax);
  const step = getStep(rangeMin, rangeMax);
  const expandLabel = isExpanded
    ? "Narrow the slider to the values in the image"
    : "Widen the slider to the range of the data type";

  const commitContrastLimits = (a: number, b: number) => {
    const clamp = (value: number) =>
      dataTypeRange !== undefined
        ? MathUtils.clamp(value, dataTypeRange[0], dataTypeRange[1])
        : value;
    const newMin = clamp(Math.min(a, b));
    const newMax = clamp(Math.max(a, b));
    if (canExpand && (newMin < valuesRange[0] || newMax > valuesRange[1])) {
      setExpanded(true);
    }
    onContrastLimitsChange([newMin, newMax]);
  };

  const bars = useMemo(
    () =>
      histogram !== undefined
        ? binHistogram(histogram, rangeMin, rangeMax)
        : undefined,
    [histogram, rangeMin, rangeMax],
  );

  return (
    <div className={cn("flex flex-col gap-y-1", className)}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-1">
        {bars !== undefined ? (
          <svg
            className="text-muted-foreground/60 col-start-1 block h-10 w-full"
            viewBox={`0 0 ${histogramBarCount} ${histogramHeight}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {bars.map((height, i) => (
              <rect
                key={i}
                x={i}
                y={histogramHeight - height}
                width={1}
                height={height}
                className={
                  isBarSelected(i, rangeMin, rangeMax, min, max)
                    ? "fill-primary/70"
                    : "fill-current"
                }
              />
            ))}
          </svg>
        ) : null}
        <Slider
          className="col-start-1"
          value={[min, max]}
          min={rangeMin}
          max={rangeMax > rangeMin ? rangeMax : rangeMin + 1}
          step={step}
          thumbCollisionBehavior="none"
          thumbLabels={["Minimum", "Maximum"]}
          onValueChange={(value) => {
            const [newMin, newMax] = value;
            if (newMin !== undefined && newMax !== undefined) {
              onContrastLimitsChange([
                roundToStepDecimals(newMin, step),
                roundToStepDecimals(newMax, step),
              ]);
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          className="col-start-2"
          aria-label={expandLabel}
          title={expandLabel}
          disabled={!canExpand}
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronsRightLeftIcon /> : <ChevronsLeftRightIcon />}
        </Button>
        <div className="text-muted-foreground col-start-1 flex flex-row justify-between text-[10px] leading-3">
          <span>{roundToStepDecimals(rangeMin, step)}</span>
          <span>{roundToStepDecimals(rangeMax, step)}</span>
        </div>
      </div>
      <div className="flex flex-row items-center gap-x-2">
        <ContrastLimitInput
          label="min"
          value={roundToStepDecimals(min, step)}
          onValueChange={(newMin) => commitContrastLimits(newMin, max)}
        />
        <ContrastLimitInput
          label="max"
          value={roundToStepDecimals(max, step)}
          onValueChange={(newMax) => commitContrastLimits(min, newMax)}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          aria-label="Reset to the limits estimated from the file"
          title="Reset to the limits estimated from the file"
          disabled={onReset === undefined}
          onClick={onReset}
        >
          <RotateCcwIcon />
        </Button>
      </div>
    </div>
  );
}

type ContrastLimitInputProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
};

// Commits on blur or Enter rather than on every keystroke, as a partly typed
// number would be ordered against the other limit before it is complete
function ContrastLimitInput({
  label,
  value,
  onValueChange,
  className,
}: ContrastLimitInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null) {
      const newValue = parseFloat(draft);
      if (!isNaN(newValue)) {
        onValueChange(newValue);
      }
      setDraft(null);
    }
  };
  return (
    <InputGroup className={cn("w-28", className)}>
      <InputGroupAddon>{label}</InputGroupAddon>
      <InputGroupInput
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
        }}
      />
    </InputGroup>
  );
}

// Integer pixel values stay whole over a wide integer range; a narrow range is
// stepped finely even between whole bounds, as float channels usually span [0, 1]
function getStep(rangeMin: number, rangeMax: number): number {
  const span = rangeMax - rangeMin;
  if (!(span > 0)) {
    return 1;
  }
  const wholeBounds = Number.isInteger(rangeMin) && Number.isInteger(rangeMax);
  if (wholeBounds && span >= minWholeSpan) {
    return Math.max(1, Math.round(span / sliderStepCount));
  }
  return span / sliderStepCount;
}

// The bars span the slider's range rather than the histogram's, so that a bar
// and the slider position above it hold the same value; the square-root scale
// keeps sparse tails visible next to a dominant background peak
function binHistogram(
  histogram: ChannelHistogram,
  rangeMin: number,
  rangeMax: number,
): number[] {
  const {
    hist: counts,
    range: [vmin, vmax],
  } = histogram;
  const bars = new Array<number>(histogramBarCount).fill(0);
  for (let i = 0; i < counts.length; i++) {
    const value = vmin + (i / Math.max(counts.length - 1, 1)) * (vmax - vmin);
    // the upper bound lands on the bar past the last one; it belongs to the last
    const bar = Math.min(
      Math.floor(barPosition(value, rangeMin, rangeMax)),
      histogramBarCount - 1,
    );
    if (bar >= 0) {
      bars[bar]! += counts[i]!;
    }
  }
  const peak = Math.sqrt(Math.max(...bars, 1));
  return bars.map((count) => (Math.sqrt(count) / peak) * histogramHeight);
}

function barPosition(
  value: number,
  rangeMin: number,
  rangeMax: number,
): number {
  const span = rangeMax - rangeMin;
  return span > 0 ? ((value - rangeMin) / span) * histogramBarCount : 0;
}

function isBarSelected(
  bar: number,
  rangeMin: number,
  rangeMax: number,
  min: number,
  max: number,
): boolean {
  return (
    bar + 1 > barPosition(min, rangeMin, rangeMax) &&
    bar < barPosition(max, rangeMin, rangeMax)
  );
}

// Dragging would otherwise store floating-point noise
function roundToStepDecimals(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(value.toFixed(decimals));
}
