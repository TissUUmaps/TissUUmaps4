import { cn } from "@/lib/utils";

import { type Image } from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "../../common/fieldset";

export type ImagesLayersPanelProps = {
  image: Image;
  className?: string;
};

export function ImagesLayersPanel({ className }: ImagesLayersPanelProps) {
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
