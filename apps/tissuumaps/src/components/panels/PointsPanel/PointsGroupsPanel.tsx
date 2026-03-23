import { type Points } from "@tissuumaps/core";

import { cn } from "@/lib/utils";

import { Fieldset, FieldsetLegend } from "../../common/fieldset";

export type PointsGroupsPanelProps = {
  points: Points;
  className?: string;
};

export function PointsGroupsPanel({ className }: PointsGroupsPanelProps) {
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
