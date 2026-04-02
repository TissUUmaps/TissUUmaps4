import { type Points } from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cn } from "@/lib/utils";

export type PointsLayersPanelProps = {
  points: Points;
  className?: string;
};

export function PointsLayersPanel({ className }: PointsLayersPanelProps) {
  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Layers
      </FieldsetLegend>
    </Fieldset>
  );
}
