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
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";
import { useColorConfigControl } from "../../controls/ColorConfigControl/useColorConfigControl";
import {
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import { useOpacityConfigControl } from "../../controls/OpacityConfigControl/useOpacityConfigControl";
import {
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";
import { useVisibilityConfigControl } from "../../controls/VisibilityConfigControl/useVisibilityConfigControl";

export type LabelsSettingsPanelProps = {
  labels: Labels;
  className?: string;
};

export function LabelsSettingsPanel({
  labels,
  className,
}: LabelsSettingsPanelProps) {
  const updateLabels = useTissUUmaps((state) => state.updateLabels);

  const labelColorConfigControlState = useColorConfigControl(
    labels.labelColor,
    (newColorConfig) => updateLabels(labels.id, { labelColor: newColorConfig }),
    defaultLabelColor,
  );
  const labelVisibilityConfigControlState = useVisibilityConfigControl(
    labels.labelVisibility,
    (newVisibilityConfig) =>
      updateLabels(labels.id, { labelVisibility: newVisibilityConfig }),
    defaultLabelVisibility,
  );
  const labelOpacityConfigControlState = useOpacityConfigControl(
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
              state={labelColorConfigControlState}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl state={labelColorConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Label visibility */}
        <AccordionItem value="labelVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              state={labelVisibilityConfigControlState}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigControl
              state={labelVisibilityConfigControlState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Label opacity */}
        <AccordionItem value="labelOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Label opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              state={labelOpacityConfigControlState}
              className="ml-auto"
            />
          </AccordionHeader>
          <AccordionPanel>
            <OpacityConfigControl state={labelOpacityConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
