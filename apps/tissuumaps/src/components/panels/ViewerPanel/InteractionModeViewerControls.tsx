import { HandIcon, PencilIcon, PentagonIcon, SquareIcon } from "lucide-react";

import type { InteractionMode } from "@tissuumaps/core";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";

export type InteractionModeViewerControlsProps = { className?: string };

export function InteractionModeViewerControls({
  className,
}: InteractionModeViewerControlsProps) {
  const interactionMode = useAppStore((state) => state.interactionMode);
  const setInteractionMode = useAppStore((state) => state.setInteractionMode);

  return (
    <ToggleGroup
      className={cn(
        "m-2 rounded-xl border border-border bg-background p-1.5 shadow-lg",
        className,
      )}
      spacing={1}
      value={[interactionMode]}
      onValueChange={(value) => {
        if (value.length > 0) {
          setInteractionMode(value[0] as InteractionMode);
        }
      }}
    >
      <ToggleGroupItem
        value="pan"
        aria-label="Pan"
        className="aria-pressed:bg-muted aria-pressed:text-foreground rounded-lg"
      >
        <HandIcon />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="drawRectangle"
        aria-label="Draw rectangle"
        className="aria-pressed:bg-muted aria-pressed:text-foreground rounded-lg"
      >
        <SquareIcon />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="drawPolygon"
        aria-label="Draw polygon"
        className="aria-pressed:bg-muted aria-pressed:text-foreground rounded-lg"
      >
        <PentagonIcon />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="drawFreehand"
        aria-label="Draw freehand"
        className="aria-pressed:bg-muted aria-pressed:text-foreground rounded-lg"
      >
        <PencilIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
