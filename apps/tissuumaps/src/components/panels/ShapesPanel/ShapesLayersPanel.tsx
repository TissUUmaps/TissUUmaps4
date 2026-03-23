import { type Shapes } from "@tissuumaps/core";

import { cn } from "@/lib/utils";

import { Fieldset, FieldsetLegend } from "../../common/fieldset";

export type ShapesLayersPanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesLayersPanel({ className }: ShapesLayersPanelProps) {
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
