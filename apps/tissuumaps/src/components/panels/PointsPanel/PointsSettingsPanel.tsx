import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  type Points,
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointSizeUnit,
  defaultPointVisibility,
} from "@tissuumaps/core";

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
  ActiveColorConfigValue,
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";
import { useColorConfigControl } from "../../controls/ColorConfigControl/useColorConfigControl";
import {
  ActiveMarkerConfigValue,
  MarkerConfigControl,
  MarkerConfigSourceToggleGroup,
} from "../../controls/MarkerConfigControl";
import { useMarkerConfigControl } from "../../controls/MarkerConfigControl/useMarkerConfigControl";
import {
  ActiveOpacityConfigValue,
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import { useOpacityConfigControl } from "../../controls/OpacityConfigControl/useOpacityConfigControl";
import {
  ActiveSizeConfigValue,
  SizeConfigControl,
  SizeConfigSourceToggleGroup,
} from "../../controls/SizeConfigControl";
import { useSizeConfigControl } from "../../controls/SizeConfigControl/useSizeConfigControl";
import {
  ActiveVisibilityConfigValue,
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";
import { useVisibilityConfigControl } from "../../controls/VisibilityConfigControl/useVisibilityConfigControl";

export type PointsSettingsPanelProps = {
  points: Points;
  className?: string;
};

export function PointsSettingsPanel({
  points,
  className,
}: PointsSettingsPanelProps) {
  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  const pointMarkerConfigControlState = useMarkerConfigControl(
    points.pointMarker,
    (newMarkerConfig) =>
      updatePoints(points.id, { pointMarker: newMarkerConfig }),
    defaultPointMarker,
  );
  const pointSizeConfigControlState = useSizeConfigControl(
    points.pointSize,
    (newSizeConfig) => updatePoints(points.id, { pointSize: newSizeConfig }),
    defaultPointSize,
    defaultPointSizeUnit,
  );
  const pointColorConfigControlState = useColorConfigControl(
    points.pointColor,
    (newColorConfig) => updatePoints(points.id, { pointColor: newColorConfig }),
    defaultPointColor,
  );
  const pointVisibilityConfigControlState = useVisibilityConfigControl(
    points.pointVisibility,
    (newVisibilityConfig) =>
      updatePoints(points.id, { pointVisibility: newVisibilityConfig }),
    defaultPointVisibility,
  );
  const pointOpacityConfigControlState = useOpacityConfigControl(
    points.pointOpacity,
    (newOpacityConfig) =>
      updatePoints(points.id, { pointOpacity: newOpacityConfig }),
    defaultPointOpacity,
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
                value={points.name}
                onChange={(event) =>
                  updatePoints(points.id, { name: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel>Visibility</FieldLabel>
              <div className="flex flex-row items-center gap-x-2">
                <Switch
                  checked={points.visibility}
                  onCheckedChange={(checked) =>
                    updatePoints(points.id, { visibility: checked })
                  }
                />
                {points.visibility ? "Visible" : "Hidden"}
              </div>
            </Field>
            <Field>
              <FieldLabel>Opacity</FieldLabel>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={points.opacity}
                onChange={(event) => {
                  const opacity = event.target.valueAsNumber;
                  if (Number.isFinite(opacity)) {
                    updatePoints(points.id, {
                      opacity: Math.min(Math.max(0, opacity), 1),
                    });
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Point size factor</FieldLabel>
              <Input
                type="number"
                min={0}
                value={points.pointSizeFactor}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (Number.isFinite(value)) {
                    updatePoints(points.id, { pointSizeFactor: value });
                  }
                }}
              />
            </Field>
          </AccordionPanel>
        </AccordionItem>
        {/* Point marker */}
        <AccordionItem value="pointMarker">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point marker</AccordionTrigger>
            <ActiveMarkerConfigValue
              state={pointMarkerConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <MarkerConfigSourceToggleGroup
              state={pointMarkerConfigControlState}
              className="border rounded"
            />
            <MarkerConfigControl state={pointMarkerConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point size */}
        <AccordionItem value="pointSize">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point size</AccordionTrigger>
            <ActiveSizeConfigValue
              state={pointSizeConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <SizeConfigSourceToggleGroup
              state={pointSizeConfigControlState}
              className="border rounded"
            />
            <SizeConfigControl state={pointSizeConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point color */}
        <AccordionItem value="pointColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point color</AccordionTrigger>
            <ActiveColorConfigValue
              state={pointColorConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <ColorConfigSourceToggleGroup
              state={pointColorConfigControlState}
              className="border rounded"
            />
            <ColorConfigControl state={pointColorConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point visibility */}
        <AccordionItem value="pointVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point visibility</AccordionTrigger>
            <ActiveVisibilityConfigValue
              state={pointVisibilityConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <VisibilityConfigSourceToggleGroup
              state={pointVisibilityConfigControlState}
              className="border rounded"
            />
            <VisibilityConfigControl
              state={pointVisibilityConfigControlState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Point opacity */}
        <AccordionItem value="pointOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point opacity</AccordionTrigger>
            <ActiveOpacityConfigValue
              state={pointOpacityConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <OpacityConfigSourceToggleGroup
              state={pointOpacityConfigControlState}
              className="border rounded"
            />
            <OpacityConfigControl state={pointOpacityConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
