import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { type Image } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";

export type ImagesSettingsPanelProps = {
  image: Image;
  className?: string;
};

export function ImagesSettingsPanel({
  image,
  className,
}: ImagesSettingsPanelProps) {
  const updateImage = useTissUUmaps((state) => state.updateImage);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Settings
      </FieldsetLegend>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          value={image.name}
          onChange={(event) =>
            updateImage(image.id, { name: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel>Visibility</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch
            checked={image.visibility}
            onCheckedChange={(checked) =>
              updateImage(image.id, { visibility: checked })
            }
          />
          {image.visibility ? "Visible" : "Hidden"}
        </div>
      </Field>
      <Field>
        <FieldLabel>Opacity</FieldLabel>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={image.opacity}
          onChange={(event) => {
            const opacity = event.target.valueAsNumber;
            if (Number.isFinite(opacity)) {
              updateImage(image.id, {
                opacity: Math.min(Math.max(0, opacity), 1),
              });
            }
          }}
        />
      </Field>
    </Fieldset>
  );
}
