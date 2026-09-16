import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider<Value extends number | readonly number[]>({
  className,
  value,
  defaultValue,
  "aria-label": ariaLabel,
  ...props
}: SliderPrimitive.Root.Props<Value>) {
  const values = value ?? defaultValue;
  const thumbCount = typeof values === "number" ? 1 : (values?.length ?? 1);
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      defaultValue={defaultValue}
      className={cn("relative flex w-full touch-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="flex w-full items-center py-2"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-input relative h-1.5 w-full grow overflow-hidden rounded-full"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="bg-primary absolute h-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            data-slot="slider-thumb"
            aria-label={ariaLabel}
            // the thumb renders a nested input, which takes the focus
            className="border-primary bg-background has-[:focus-visible]:ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] outline-none has-[:focus-visible]:ring-[3px] data-disabled:pointer-events-none data-disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
