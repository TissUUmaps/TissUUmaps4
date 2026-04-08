import { HandIcon, PencilIcon, PentagonIcon, SquareIcon } from "lucide-react";

import type { InteractionMode } from "@tissuumaps/core";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type InteractionModeViewerControlsProps = { className?: string };

export function InteractionModeViewerControls({
  className,
}: InteractionModeViewerControlsProps) {
  const interactionMode = useTissUUmaps((s) => s.interactionMode);
  const setInteractionMode = useTissUUmaps((s) => s.setInteractionMode);

  return (
    <ToggleGroup
      className={cn(
        "m-2 gap-1 rounded-xl border border-border bg-background p-1.5 shadow-lg",
        className,
      )}
      variant="default"
      size="default"
      value={[interactionMode]}
      onValueChange={(value) => {
        const mode = value[value.length - 1] as InteractionMode | undefined;
        if (mode !== undefined) {
          setInteractionMode(mode);
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
