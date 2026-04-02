import {
  MathUtils,
  type Points,
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointSizeUnit,
  defaultPointVisibility,
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
  ActiveColorConfigValue,
  ColorConfigSourceToggleGroup,
  ColorConfigWidget,
} from "../../widgets/config/ColorConfigWidget";
import { useColorConfigWidget } from "../../widgets/config/ColorConfigWidget/useColorConfigWidget";
import {
  ActiveMarkerConfigValue,
  MarkerConfigSourceToggleGroup,
  MarkerConfigWidget,
} from "../../widgets/config/MarkerConfigWidget";
import { useMarkerConfigWidget } from "../../widgets/config/MarkerConfigWidget/useMarkerConfigWidget";
import {
  ActiveOpacityConfigValue,
  OpacityConfigSourceToggleGroup,
  OpacityConfigWidget,
} from "../../widgets/config/OpacityConfigWidget";
import { useOpacityConfigWidget } from "../../widgets/config/OpacityConfigWidget/useOpacityConfigWidget";
import {
  ActiveSizeConfigValue,
  SizeConfigSourceToggleGroup,
  SizeConfigWidget,
} from "../../widgets/config/SizeConfigWidget";
import { useSizeConfigWidget } from "../../widgets/config/SizeConfigWidget/useSizeConfigWidget";
import {
  ActiveVisibilityConfigValue,
  VisibilityConfigSourceToggleGroup,
  VisibilityConfigWidget,
} from "../../widgets/config/VisibilityConfigWidget";
import { useVisibilityConfigWidget } from "../../widgets/config/VisibilityConfigWidget/useVisibilityConfigWidget";

export type PointsSettingsPanelProps = {
  points: Points;
  className?: string;
};

export function PointsSettingsPanel({
  points,
  className,
}: PointsSettingsPanelProps) {
  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  const pointMarkerConfigWidgetState = useMarkerConfigWidget(
    points.pointMarker,
    (newMarkerConfig) =>
      updatePoints(points.id, { pointMarker: newMarkerConfig }),
    defaultPointMarker,
  );
  const pointSizeConfigWidgetState = useSizeConfigWidget(
    points.pointSize,
    (newSizeConfig) => updatePoints(points.id, { pointSize: newSizeConfig }),
    defaultPointSize,
    defaultPointSizeUnit,
  );
  const pointColorConfigWidgetState = useColorConfigWidget(
    points.pointColor,
    (newColorConfig) => updatePoints(points.id, { pointColor: newColorConfig }),
    defaultPointColor,
  );
  const pointVisibilityConfigWidgetState = useVisibilityConfigWidget(
    points.pointVisibility,
    (newVisibilityConfig) =>
      updatePoints(points.id, { pointVisibility: newVisibilityConfig }),
    defaultPointVisibility,
  );
  const pointOpacityConfigWidgetState = useOpacityConfigWidget(
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
                inputMode="decimal"
                step={0.01}
                min={0}
                max={1}
                value={points.opacity}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    updatePoints(points.id, {
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
            <Field>
              <FieldLabel>Point size factor</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                value={points.pointSizeFactor}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    updatePoints(points.id, {
                      pointSizeFactor: Math.max(
                        0,
                        parseFloat(event.target.value),
                      ),
                    });
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
              state={pointMarkerConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <MarkerConfigSourceToggleGroup
              state={pointMarkerConfigWidgetState}
              className="border rounded"
            />
            <MarkerConfigWidget state={pointMarkerConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point size */}
        <AccordionItem value="pointSize">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point size</AccordionTrigger>
            <ActiveSizeConfigValue
              state={pointSizeConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <SizeConfigSourceToggleGroup
              state={pointSizeConfigWidgetState}
              className="border rounded"
            />
            <SizeConfigWidget state={pointSizeConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point color */}
        <AccordionItem value="pointColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point color</AccordionTrigger>
            <ActiveColorConfigValue
              state={pointColorConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <ColorConfigSourceToggleGroup
              state={pointColorConfigWidgetState}
              className="border rounded"
            />
            <ColorConfigWidget state={pointColorConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point visibility */}
        <AccordionItem value="pointVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point visibility</AccordionTrigger>
            <ActiveVisibilityConfigValue
              state={pointVisibilityConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <VisibilityConfigSourceToggleGroup
              state={pointVisibilityConfigWidgetState}
              className="border rounded"
            />
            <VisibilityConfigWidget state={pointVisibilityConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Point opacity */}
        <AccordionItem value="pointOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Point opacity</AccordionTrigger>
            <ActiveOpacityConfigValue
              state={pointOpacityConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <OpacityConfigSourceToggleGroup
              state={pointOpacityConfigWidgetState}
              className="border rounded"
            />
            <OpacityConfigWidget state={pointOpacityConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
