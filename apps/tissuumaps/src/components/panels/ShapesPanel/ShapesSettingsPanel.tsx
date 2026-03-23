import {
  type Shapes,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
} from "@tissuumaps/core";

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
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";
import { useColorConfigControl } from "../../controls/ColorConfigControl/useColorConfigControl";
import {
  ActiveOpacityConfigValue,
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import { useOpacityConfigControl } from "../../controls/OpacityConfigControl/useOpacityConfigControl";
import {
  ActiveVisibilityConfigValue,
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";
import { useVisibilityConfigControl } from "../../controls/VisibilityConfigControl/useVisibilityConfigControl";
import { Input } from "../../ui/input";
import { Switch } from "../../ui/switch";

export type ShapesSettingsPanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesSettingsPanel({
  shapes,
  className,
}: ShapesSettingsPanelProps) {
  const updateShapes = useTissUUmaps((state) => state.updateShapes);

  const shapeFillColorConfigControlState = useColorConfigControl(
    shapes.shapeFillColor,
    (newColorConfig) =>
      updateShapes(shapes.id, { shapeFillColor: newColorConfig }),
    defaultShapeFillColor,
  );
  const shapeFillVisibilityConfigControlState = useVisibilityConfigControl(
    shapes.shapeFillVisibility,
    (newVisibilityConfig) =>
      updateShapes(shapes.id, { shapeFillVisibility: newVisibilityConfig }),
    defaultShapeFillVisibility,
  );
  const shapeFillOpacityConfigControlState = useOpacityConfigControl(
    shapes.shapeFillOpacity,
    (newOpacityConfig) =>
      updateShapes(shapes.id, { shapeFillOpacity: newOpacityConfig }),
    defaultShapeFillOpacity,
  );
  const shapeStrokeColorConfigControlState = useColorConfigControl(
    shapes.shapeStrokeColor,
    (newColorConfig) =>
      updateShapes(shapes.id, { shapeStrokeColor: newColorConfig }),
    defaultShapeStrokeColor,
  );
  const shapeStrokeVisibilityConfigControlState = useVisibilityConfigControl(
    shapes.shapeStrokeVisibility,
    (newVisibilityConfig) =>
      updateShapes(shapes.id, {
        shapeStrokeVisibility: newVisibilityConfig,
      }),
    defaultShapeStrokeVisibility,
  );
  const shapeStrokeOpacityConfigControlState = useOpacityConfigControl(
    shapes.shapeStrokeOpacity,
    (newOpacityConfig) =>
      updateShapes(shapes.id, { shapeStrokeOpacity: newOpacityConfig }),
    defaultShapeStrokeOpacity,
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
        <AccordionItem value="shapeFillColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill color</AccordionTrigger>
            <ActiveColorConfigValue
              state={shapeFillColorConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <ColorConfigSourceToggleGroup
              state={shapeFillColorConfigControlState}
              className="border rounded"
            />
            <ColorConfigControl state={shapeFillColorConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape fill visibility */}
        <AccordionItem value="shapeFillVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill visibility</AccordionTrigger>
            <ActiveVisibilityConfigValue
              state={shapeFillVisibilityConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <VisibilityConfigSourceToggleGroup
              state={shapeFillVisibilityConfigControlState}
              className="border rounded"
            />
            <VisibilityConfigControl
              state={shapeFillVisibilityConfigControlState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape fill opacity */}
        <AccordionItem value="shapeFillOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill opacity</AccordionTrigger>
            <ActiveOpacityConfigValue
              state={shapeFillOpacityConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <OpacityConfigSourceToggleGroup
              state={shapeFillOpacityConfigControlState}
              className="border rounded"
            />
            <OpacityConfigControl state={shapeFillOpacityConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape stroke color */}
        <AccordionItem value="shapeStrokeColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke color</AccordionTrigger>
            <ActiveColorConfigValue
              state={shapeStrokeColorConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <ColorConfigSourceToggleGroup
              state={shapeStrokeColorConfigControlState}
              className="border rounded"
            />
            <ColorConfigControl state={shapeStrokeColorConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape stroke visibility */}
        <AccordionItem value="shapeStrokeVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke visibility</AccordionTrigger>
            <ActiveVisibilityConfigValue
              state={shapeStrokeVisibilityConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <VisibilityConfigSourceToggleGroup
              state={shapeStrokeVisibilityConfigControlState}
              className="border rounded"
            />
            <VisibilityConfigControl
              state={shapeStrokeVisibilityConfigControlState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape stroke opacity */}
        <AccordionItem value="shapeStrokeOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke opacity</AccordionTrigger>
            <ActiveOpacityConfigValue
              state={shapeStrokeOpacityConfigControlState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <OpacityConfigSourceToggleGroup
              state={shapeStrokeOpacityConfigControlState}
              className="border rounded"
            />
            <OpacityConfigControl
              state={shapeStrokeOpacityConfigControlState}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
