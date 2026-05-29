import { type Layer, MathUtils } from "@tissuumaps/core";

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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TransformSettingsWidget } from "@/components/widgets/TransformSettingsWidget";
import { useControlled } from "@/hooks/useControlled";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { LayerSettingsCategory } from "./category";

export type LayerSettingsWidgetProps = {
  layer: Layer;
  activeCategory?: LayerSettingsCategory | null;
  onActiveCategoryChange?: (
    newActiveCategory: LayerSettingsCategory | null,
  ) => void;
  className?: string;
};

export function LayerSettingsWidget({
  layer,
  activeCategory: controlledActiveCategory,
  onActiveCategoryChange: setControlledActiveCategory,
  className,
}: LayerSettingsWidgetProps) {
  const updateLayer = useTissUUmaps((state) => state.updateLayer);

  const [activeCategory, setActiveCategory] = useControlled(
    controlledActiveCategory,
    setControlledActiveCategory,
    null,
  );

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Settings
      </FieldsetLegend>
      <Accordion
        value={activeCategory !== null ? [activeCategory] : []}
        onValueChange={(value) =>
          setActiveCategory(
            value.length > 0 ? (value[0] as LayerSettingsCategory) : null,
          )
        }
      >
        <AccordionItem value={LayerSettingsCategory.general}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>General</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <GeneralLayerSettingsWidget layer={layer} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value={LayerSettingsCategory.transform}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Transform</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <TransformSettingsWidget
              transform={layer.transform}
              onTransformChange={(transform) =>
                updateLayer(layer.id, { transform })
              }
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}

type GeneralLayerSettingsWidgetProps = {
  layer: Layer;
  className?: string;
};

function GeneralLayerSettingsWidget({
  layer,
  className,
}: GeneralLayerSettingsWidgetProps) {
  const updateLayer = useTissUUmaps((state) => state.updateLayer);

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          value={layer.name}
          onChange={(event) =>
            updateLayer(layer.id, { name: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel>Visibility</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch
            checked={layer.visibility}
            onCheckedChange={(checked) =>
              updateLayer(layer.id, { visibility: checked })
            }
          />
          {layer.visibility ? "Visible" : "Hidden"}
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
          value={layer.opacity}
          onChange={(event) => {
            const newValue = event.target.valueAsNumber;
            if (!isNaN(newValue)) {
              updateLayer(layer.id, {
                opacity: MathUtils.clamp(newValue, 0, 1),
              });
            }
          }}
        />
      </Field>
      <Field>
        <FieldLabel>Point size factor</FieldLabel>
        <Input
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          value={layer.pointSizeFactor}
          onChange={(event) => {
            const newValue = event.target.valueAsNumber;
            if (!isNaN(newValue)) {
              updateLayer(layer.id, {
                pointSizeFactor: Math.max(0, newValue),
              });
            }
          }}
        />
      </Field>
    </div>
  );
}
