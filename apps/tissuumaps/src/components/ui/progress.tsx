import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

/**
 * A thin progress bar built on Base UI's Progress primitive.
 *
 * Pass `value={null}` (the default) to render an indeterminate bar — a small
 * segment that loops across the track — which is used until a determinate total
 * is known or for sources that cannot report progress.
 */
export function Progress({
  value = null,
  max = 100,
  className,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      max={max}
      className={cn("w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator className="h-full rounded-full bg-primary transition-all duration-200 data-[indeterminate]:w-2/5 data-[indeterminate]:animate-[progress-indeterminate_1.2s_ease-in-out_infinite]" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
