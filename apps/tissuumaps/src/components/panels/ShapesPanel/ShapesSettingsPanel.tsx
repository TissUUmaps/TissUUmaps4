import { cn } from "@/lib/utils";
import { useState } from "react";

import {
  type Shapes,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
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
import { ColorConfigSourceValue } from "../../controls/ColorConfigControl/ColorConfigSourceValue";
import {
  OpacityConfigContextProvider,
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import { OpacityConfigSourceValue } from "../../controls/OpacityConfigControl/OpacityConfigSourceValue";
import {
  VisibilityConfigContextProvider,
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";
import { VisibilityConfigSourceValue } from "../../controls/VisibilityConfigControl/VisibilityConfigSourceValue";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";

const ConfigControl = {
  general: "general",
  shapeFillColor: "shapeFillColor",
  shapeFillVisibility: "shapeFillVisibility",
  shapeFillOpacity: "shapeFillOpacity",
  shapeStrokeColor: "shapeStrokeColor",
  shapeStrokeVisibility: "shapeStrokeVisibility",
  shapeStrokeOpacity: "shapeStrokeOpacity",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export type ShapesSettingsPanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesSettingsPanel({
  shapes,
  className,
}: ShapesSettingsPanelProps) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const updateShapes = useTissUUmaps((state) => state.updateShapes);

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
        {/* General settings */}
        <AccordionItem value={ConfigControl.general}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>General</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={shapes.name}
                onChange={(event) =>
                  updateShapes(shapes.id, { name: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel>Visibility</FieldLabel>
              <div className="flex flex-row items-center gap-x-2">
                <Switch
                  checked={shapes.visibility}
                  onCheckedChange={(checked) =>
                    updateShapes(shapes.id, { visibility: checked })
                  }
                />
                {shapes.visibility ? "Visible" : "Hidden"}
              </div>
            </Field>
            <Field>
              <FieldLabel>Opacity</FieldLabel>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={shapes.opacity}
                onChange={(event) => {
                  const opacity = event.target.valueAsNumber;
                  if (Number.isFinite(opacity)) {
                    updateShapes(shapes.id, {
                      opacity: Math.min(Math.max(0, opacity), 1),
                    });
                  }
                }}
              />
            </Field>
          </AccordionPanel>
        </AccordionItem>
        {/* Shape fill color */}
        <ColorConfigContextProvider
          colorConfig={shapes.shapeFillColor}
          onColorConfigChange={(newColorConfig) =>
            updateShapes(shapes.id, { shapeFillColor: newColorConfig })
          }
          defaultColor={defaultShapeFillColor}
        >
          <AccordionItem value={ConfigControl.shapeFillColor}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Fill color</AccordionTrigger>
              <ColorConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.shapeFillColor)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <ColorConfigSourceToggleGroup className="border rounded" />
              <ColorConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </ColorConfigContextProvider>
        {/* Shape fill visibility */}
        <VisibilityConfigContextProvider
          visibilityConfig={shapes.shapeFillVisibility}
          onVisibilityConfigChange={(newVisibilityConfig) =>
            updateShapes(shapes.id, {
              shapeFillVisibility: newVisibilityConfig,
            })
          }
          defaultVisibility={defaultShapeFillVisibility}
        >
          <AccordionItem value={ConfigControl.shapeFillVisibility}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Fill visibility</AccordionTrigger>
              <VisibilityConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.shapeFillVisibility)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <VisibilityConfigSourceToggleGroup className="border rounded" />
              <VisibilityConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </VisibilityConfigContextProvider>
        {/* Shape fill opacity */}
        <OpacityConfigContextProvider
          opacityConfig={shapes.shapeFillOpacity}
          onOpacityConfigChange={(newOpacityConfig) =>
            updateShapes(shapes.id, { shapeFillOpacity: newOpacityConfig })
          }
          defaultOpacity={defaultShapeFillOpacity}
        >
          <AccordionItem value={ConfigControl.shapeFillOpacity}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Fill opacity</AccordionTrigger>
              <OpacityConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.shapeFillOpacity)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <OpacityConfigSourceToggleGroup className="border rounded" />
              <OpacityConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </OpacityConfigContextProvider>
        {/* Shape stroke color */}
        <ColorConfigContextProvider
          colorConfig={shapes.shapeStrokeColor}
          onColorConfigChange={(newColorConfig) =>
            updateShapes(shapes.id, { shapeStrokeColor: newColorConfig })
          }
          defaultColor={defaultShapeStrokeColor}
        >
          <AccordionItem value={ConfigControl.shapeStrokeColor}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Stroke color</AccordionTrigger>
              <ColorConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.shapeStrokeColor)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <ColorConfigSourceToggleGroup className="border rounded" />
              <ColorConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </ColorConfigContextProvider>
        {/* Shape stroke visibility */}
        <VisibilityConfigContextProvider
          visibilityConfig={shapes.shapeStrokeVisibility}
          onVisibilityConfigChange={(newVisibilityConfig) =>
            updateShapes(shapes.id, {
              shapeStrokeVisibility: newVisibilityConfig,
            })
          }
          defaultVisibility={defaultShapeStrokeVisibility}
        >
          <AccordionItem value={ConfigControl.shapeStrokeVisibility}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Stroke visibility</AccordionTrigger>
              <VisibilityConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.shapeStrokeVisibility)
                }
              />
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              <VisibilityConfigSourceToggleGroup className="border rounded" />
              <VisibilityConfigControl />
            </AccordionPanel>
          </AccordionItem>
        </VisibilityConfigContextProvider>
        {/* Shape stroke opacity */}
        <OpacityConfigContextProvider
          opacityConfig={shapes.shapeStrokeOpacity}
          onOpacityConfigChange={(newOpacityConfig) =>
            updateShapes(shapes.id, { shapeStrokeOpacity: newOpacityConfig })
          }
          defaultOpacity={defaultShapeStrokeOpacity}
        >
          <AccordionItem value={ConfigControl.shapeStrokeOpacity}>
            <AccordionHeader>
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>Stroke opacity</AccordionTrigger>
              <OpacityConfigSourceValue
                className="ml-auto text-sm text-slate-600 dark:text-slate-400"
                onClick={() =>
                  setExpandedConfigControl(ConfigControl.shapeStrokeOpacity)
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
