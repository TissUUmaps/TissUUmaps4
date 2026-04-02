import {
  type Labels,
  MathUtils,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "@tissuumaps/core";

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
import {
  ColorConfigSourceToggleGroup,
  ColorConfigWidget,
} from "@/components/widgets/config/ColorConfigWidget";
import { useColorConfigWidget } from "@/components/widgets/config/ColorConfigWidget/hooks";
import {
  OpacityConfigSourceToggleGroup,
  OpacityConfigWidget,
} from "@/components/widgets/config/OpacityConfigWidget";
import { useOpacityConfigWidget } from "@/components/widgets/config/OpacityConfigWidget/hooks";
import {
  VisibilityConfigSourceToggleGroup,
  VisibilityConfigWidget,
} from "@/components/widgets/config/VisibilityConfigWidget";
import { useVisibilityConfigWidget } from "@/components/widgets/config/VisibilityConfigWidget/hooks";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type LabelsSettingsPanelProps = {
  labels: Labels;
  className?: string;
};

export function LabelsSettingsPanel({
  labels,
  className,
}: LabelsSettingsPanelProps) {
  const updateLabels = useTissUUmaps((state) => state.updateLabels);

  const labelColorConfigWidgetAdapter = useColorConfigWidget(
    labels.labelColor,
    (newColorConfig) => updateLabels(labels.id, { labelColor: newColorConfig }),
    defaultLabelColor,
  );
  const labelVisibilityConfigWidgetAdapter = useVisibilityConfigWidget(
    labels.labelVisibility,
    (newVisibilityConfig) =>
      updateLabels(labels.id, { labelVisibility: newVisibilityConfig }),
    defaultLabelVisibility,
  );
  const labelOpacityConfigWidgetAdapter = useOpacityConfigWidget(
    labels.labelOpacity,
    (newOpacityConfig) =>
      updateLabels(labels.id, { labelOpacity: newOpacityConfig }),
    defaultLabelOpacity,
  );

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
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={labels.name}
                onChange={(event) =>
                  updateLabels(labels.id, { name: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel>Visibility</FieldLabel>
              <div className="flex flex-row items-center gap-x-2">
                <Switch
                  checked={labels.visibility}
                  onCheckedChange={(checked) =>
                    updateLabels(labels.id, { visibility: checked })
                  }
                />
                {labels.visibility ? "Visible" : "Hidden"}
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
                value={labels.opacity}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    updateLabels(labels.id, {
                      opacity: MathUtils.clamp(
                        parseFloat(event.target.value),
                        0,
                        1,
                      ),
                    });
                  }
                }}
              />
            </Field>
          </AccordionPanel>
        </AccordionItem>
        {/* Label color */}
        <AccordionItem value="labelColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label color</AccordionTrigger>
            <ColorConfigSourceToggleGroup
              adapter={labelColorConfigWidgetAdapter}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigWidget adapter={labelColorConfigWidgetAdapter} />
          </AccordionPanel>
        </AccordionItem>
        {/* Label visibility */}
        <AccordionItem value="labelVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              adapter={labelVisibilityConfigWidgetAdapter}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigWidget
              adapter={labelVisibilityConfigWidgetAdapter}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Label opacity */}
        <AccordionItem value="labelOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              adapter={labelOpacityConfigWidgetAdapter}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <OpacityConfigWidget adapter={labelOpacityConfigWidgetAdapter} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
