import { type Image, MathUtils } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type ImageSettingsWidgetProps = {
  image: Image;
  className?: string;
};

export function ImageSettingsWidget({
  image,
  className,
}: ImageSettingsWidgetProps) {
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
          inputMode="decimal"
          step={0.01}
          min={0}
          max={1}
          value={image.opacity}
          onChange={(event) => {
            if (event.target.value !== "") {
              updateImage(image.id, {
                opacity: MathUtils.clamp(parseFloat(event.target.value), 0, 1),
              });
            }
          }}
        />
      </Field>
    </Fieldset>
  );
}
