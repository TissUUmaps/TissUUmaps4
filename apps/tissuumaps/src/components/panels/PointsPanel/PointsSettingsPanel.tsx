import { ColorConfigSourceValue } from "@/components/controls/ColorConfigControl/ColorConfigSourceValue";
import { MarkerConfigSourceValue } from "@/components/controls/MarkerConfigControl/MarkerConfigSourceValue";
import { OpacityConfigSourceValue } from "@/components/controls/OpacityConfigControl/OpacityConfigSourceValue";
import { SizeConfigSourceValue } from "@/components/controls/SizeConfigControl/SizeConfigSourceValue";
import { VisibilityConfigSourceValue } from "@/components/controls/VisibilityConfigControl/VisibilityConfigSourceValue";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  ColorConfigContextProvider,
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";
import {
  MarkerConfigContextProvider,
  MarkerConfigControl,
  MarkerConfigSourceToggleGroup,
} from "../../controls/MarkerConfigControl";
import {
  OpacityConfigContextProvider,
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import {
  SizeConfigContextProvider,
  SizeConfigControl,
  SizeConfigSourceToggleGroup,
} from "../../controls/SizeConfigControl";
import {
  VisibilityConfigContextProvider,
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";
import { Switch } from "../../ui/switch";

const ConfigControl = {
  general: "general",
  pointMarker: "pointMarker",
  pointSize: "pointSize",
  pointColor: "pointColor",
  pointVisibility: "pointVisibility",
  pointOpacity: "pointOpacity",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export type PointsSettingsPanelProps = {
  points: Points;
  className?: string;
};

export function PointsSettingsPanel({
  points,
  className,
}: PointsSettingsPanelProps) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Settings
      </FieldsetLegend>
      <Accordion
        value={[expandedConfigControl]}
        onValueChange={(value) =>
          setExpandedConfigControl(
            (value[0] as ConfigControl | undefined) ?? null,
          )
        }
      >
        <AccordionItem value={ConfigControl.general}>
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
        <MarkerConfigContextProvider
          markerConfig={points.pointMarker}
          onMarkerConfigChange={(newMarkerConfig) =>
            updatePoints(points.id, { pointMarker: newMarkerConfig })
          }
          defaultMarker={defaultPointMarker}
        >
          <AccordionItem value={ConfigControl.pointMarker}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Point marker</AccordionTrigger>
              <MarkerConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.pointMarker)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <MarkerConfigSourceToggleGroup className="border rounded" />
              <MarkerConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </MarkerConfigContextProvider>
        {/* Point size */}
        <SizeConfigContextProvider
          sizeConfig={points.pointSize}
          onSizeConfigChange={(newSizeConfig) =>
            updatePoints(points.id, { pointSize: newSizeConfig })
          }
          defaultSize={defaultPointSize}
          defaultSizeUnit={defaultPointSizeUnit}
        >
          <AccordionItem value={ConfigControl.pointSize}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Point size</AccordionTrigger>
              <SizeConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.pointSize)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <SizeConfigSourceToggleGroup className="border rounded" />
              <SizeConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </SizeConfigContextProvider>
        {/* Point color */}
        <ColorConfigContextProvider
          colorConfig={points.pointColor}
          onColorConfigChange={(newColorConfig) =>
            updatePoints(points.id, { pointColor: newColorConfig })
          }
          defaultColor={defaultPointColor}
        >
          <AccordionItem value={ConfigControl.pointColor}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Point color</AccordionTrigger>
              <ColorConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.pointColor)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <ColorConfigSourceToggleGroup className="border rounded" />
              <ColorConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </ColorConfigContextProvider>
        {/* Point visibility */}
        <VisibilityConfigContextProvider
          visibilityConfig={points.pointVisibility}
          onVisibilityConfigChange={(newVisibilityConfig) =>
            updatePoints(points.id, { pointVisibility: newVisibilityConfig })
          }
          defaultVisibility={defaultPointVisibility}
        >
          <AccordionItem value={ConfigControl.pointVisibility}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Point visibility</AccordionTrigger>
              <VisibilityConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.pointVisibility)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <VisibilityConfigSourceToggleGroup className="border rounded" />
              <VisibilityConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </VisibilityConfigContextProvider>
        {/* Point opacity */}
        <OpacityConfigContextProvider
          opacityConfig={points.pointOpacity}
          onOpacityConfigChange={(newOpacityConfig) =>
            updatePoints(points.id, { pointOpacity: newOpacityConfig })
          }
          defaultOpacity={defaultPointOpacity}
        >
          <AccordionItem value={ConfigControl.pointOpacity}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Point opacity</AccordionTrigger>
              <OpacityConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.pointOpacity)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <OpacityConfigSourceToggleGroup className="border rounded" />
              <OpacityConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </OpacityConfigContextProvider>
      </Accordion>
    </Fieldset>
  );
}
