import { type Image, MathUtils } from "@tissuumaps/core";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerRightDownIcon,
} from "@/components/common/accordion";
import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { SimpleSelect } from "@/components/common/simple-select";
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
  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Settings
      </FieldsetLegend>
      <Accordion>
        <AccordionItem value="general">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>General</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <GeneralImageSettingsWidget image={image} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value="transform">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Transform</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <TransformImageSettingsWidget image={image} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}

type GeneralImageSettingsWidgetProps = {
  image: Image;
  className?: string;
};

function GeneralImageSettingsWidget({
  image,
  className,
}: GeneralImageSettingsWidgetProps) {
  const layers = useTissUUmaps((state) => state.layers);
  const updateImage = useTissUUmaps((state) => state.updateImage);

  return (
    <div className={className}>
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
        <FieldLabel>Layer</FieldLabel>
        <SimpleSelect
          items={layers}
          itemLabel={(l) => l.name}
          itemValue={(l) => l.id}
          value={image.layer}
          onValueChange={(value) => {
            if (value !== null) {
              updateImage(image.id, { layer: value });
            }
          }}
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
          step={0.05}
          min={0}
          max={1}
          value={image.opacity}
          onChange={(event) => {
            const newValue = event.target.valueAsNumber;
            if (!isNaN(newValue)) {
              updateImage(image.id, {
                opacity: MathUtils.clamp(newValue, 0, 1),
              });
            }
          }}
        />
      </Field>
    </div>
  );
}

type TransformImageSettingsWidgetProps = {
  image: Image;
  className?: string;
};

function TransformImageSettingsWidget({
  image,
  className,
}: TransformImageSettingsWidgetProps) {
  const updateImage = useTissUUmaps((state) => state.updateImage);

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Flip</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch
            checked={image.flip}
            onCheckedChange={(checked) =>
              updateImage(image.id, { flip: checked })
            }
          />
          {image.flip ? "Yes" : "No"}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        <Field>
          <FieldLabel>Scale</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={0.1}
            value={image.transform.scale}
            onChange={(e) => {
              if (e.target.value !== "") {
                updateImage(image.id, {
                  transform: {
                    ...image.transform,
                    scale: parseFloat(e.target.value),
                  },
                });
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Rotation (&deg;)</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={1}
            value={image.transform.rotation}
            onChange={(e) => {
              if (e.target.value !== "") {
                updateImage(image.id, {
                  transform: {
                    ...image.transform,
                    rotation: parseFloat(e.target.value),
                  },
                });
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Translate X</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={1}
            value={image.transform.translation.x}
            onChange={(e) => {
              if (e.target.value !== "") {
                updateImage(image.id, {
                  transform: {
                    ...image.transform,
                    translation: {
                      ...image.transform.translation,
                      x: parseFloat(e.target.value),
                    },
                  },
                });
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Translate Y</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={1}
            value={image.transform.translation.y}
            onChange={(e) => {
              if (e.target.value !== "") {
                updateImage(image.id, {
                  transform: {
                    ...image.transform,
                    translation: {
                      ...image.transform.translation,
                      y: parseFloat(e.target.value),
                    },
                  },
                });
              }
            }}
          />
        </Field>
      </div>
    </div>
  );
}
