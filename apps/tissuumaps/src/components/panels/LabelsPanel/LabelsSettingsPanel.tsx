import {
  type Labels,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "@tissuumaps/core";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerRightDownIcon,
} from "../../common/accordion";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import {
  ColorConfigSourceToggleGroup,
  ColorConfigWidget,
} from "../../widgets/config/ColorConfigWidget";
import { useColorConfigWidget } from "../../widgets/config/ColorConfigWidget/useColorConfigWidget";
import {
  OpacityConfigSourceToggleGroup,
  OpacityConfigWidget,
} from "../../widgets/config/OpacityConfigWidget";
import { useOpacityConfigWidget } from "../../widgets/config/OpacityConfigWidget/useOpacityConfigWidget";
import {
  VisibilityConfigSourceToggleGroup,
  VisibilityConfigWidget,
} from "../../widgets/config/VisibilityConfigWidget";
import { useVisibilityConfigWidget } from "../../widgets/config/VisibilityConfigWidget/useVisibilityConfigWidget";

export type LabelsSettingsPanelProps = {
  labels: Labels;
  className?: string;
};

export function LabelsSettingsPanel({
  labels,
  className,
}: LabelsSettingsPanelProps) {
  const updateLabels = useTissUUmaps((state) => state.updateLabels);

  const labelColorConfigWidgetState = useColorConfigWidget(
    labels.labelColor,
    (newColorConfig) => updateLabels(labels.id, { labelColor: newColorConfig }),
    defaultLabelColor,
  );
  const labelVisibilityConfigWidgetState = useVisibilityConfigWidget(
    labels.labelVisibility,
    (newVisibilityConfig) =>
      updateLabels(labels.id, { labelVisibility: newVisibilityConfig }),
    defaultLabelVisibility,
  );
  const labelOpacityConfigWidgetState = useOpacityConfigWidget(
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
                min={0}
                max={1}
                step={0.01}
                value={labels.opacity}
                onChange={(event) => {
                  const opacity = event.target.valueAsNumber;
                  if (Number.isFinite(opacity)) {
                    updateLabels(labels.id, {
                      opacity: Math.min(Math.max(0, opacity), 1),
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
              state={labelColorConfigWidgetState}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigWidget state={labelColorConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Label visibility */}
        <AccordionItem value="labelVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              state={labelVisibilityConfigWidgetState}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigWidget state={labelVisibilityConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Label opacity */}
        <AccordionItem value="labelOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              state={labelOpacityConfigWidgetState}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <OpacityConfigWidget state={labelOpacityConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
