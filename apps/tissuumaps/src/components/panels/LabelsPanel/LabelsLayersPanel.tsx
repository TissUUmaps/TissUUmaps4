import { cn } from "@/lib/utils";

import { type Labels } from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "../../common/fieldset";

export type LabelsLayersPanelProps = {
  labels: Labels;
  className?: string;
};

export function LabelsLayersPanel({ className }: LabelsLayersPanelProps) {
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
