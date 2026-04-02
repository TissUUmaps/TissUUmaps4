import { type Shapes } from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cn } from "@/lib/utils";

export type ShapesGroupsPanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesGroupsPanel({ className }: ShapesGroupsPanelProps) {
  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Groups
      </FieldsetLegend>
    </Fieldset>
  );
}
