import {
  MathUtils,
  type Shapes,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
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
  ActiveColorConfigValue,
  ColorConfigSourceToggleGroup,
  ColorConfigWidget,
} from "@/components/widgets/config/ColorConfigWidget";
import { useColorConfigWidget } from "@/components/widgets/config/ColorConfigWidget/useColorConfigWidget";
import {
  ActiveOpacityConfigValue,
  OpacityConfigSourceToggleGroup,
  OpacityConfigWidget,
} from "@/components/widgets/config/OpacityConfigWidget";
import { useOpacityConfigWidget } from "@/components/widgets/config/OpacityConfigWidget/useOpacityConfigWidget";
import {
  ActiveVisibilityConfigValue,
  VisibilityConfigSourceToggleGroup,
  VisibilityConfigWidget,
} from "@/components/widgets/config/VisibilityConfigWidget";
import { useVisibilityConfigWidget } from "@/components/widgets/config/VisibilityConfigWidget/useVisibilityConfigWidget";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type ShapesSettingsPanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesSettingsPanel({
  shapes,
  className,
}: ShapesSettingsPanelProps) {
  const updateShapes = useTissUUmaps((state) => state.updateShapes);

  const shapeFillColorConfigWidgetState = useColorConfigWidget(
    shapes.shapeFillColor,
    (newColorConfig) =>
      updateShapes(shapes.id, { shapeFillColor: newColorConfig }),
    defaultShapeFillColor,
  );
  const shapeFillVisibilityConfigWidgetState = useVisibilityConfigWidget(
    shapes.shapeFillVisibility,
    (newVisibilityConfig) =>
      updateShapes(shapes.id, { shapeFillVisibility: newVisibilityConfig }),
    defaultShapeFillVisibility,
  );
  const shapeFillOpacityConfigWidgetState = useOpacityConfigWidget(
    shapes.shapeFillOpacity,
    (newOpacityConfig) =>
      updateShapes(shapes.id, { shapeFillOpacity: newOpacityConfig }),
    defaultShapeFillOpacity,
  );
  const shapeStrokeColorConfigWidgetState = useColorConfigWidget(
    shapes.shapeStrokeColor,
    (newColorConfig) =>
      updateShapes(shapes.id, { shapeStrokeColor: newColorConfig }),
    defaultShapeStrokeColor,
  );
  const shapeStrokeVisibilityConfigWidgetState = useVisibilityConfigWidget(
    shapes.shapeStrokeVisibility,
    (newVisibilityConfig) =>
      updateShapes(shapes.id, {
        shapeStrokeVisibility: newVisibilityConfig,
      }),
    defaultShapeStrokeVisibility,
  );
  const shapeStrokeOpacityConfigWidgetState = useOpacityConfigWidget(
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
                inputMode="decimal"
                step={0.01}
                min={0}
                max={1}
                value={shapes.opacity}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    updateShapes(shapes.id, {
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
        {/* Shape fill color */}
        <AccordionItem value="shapeFillColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill color</AccordionTrigger>
            <ActiveColorConfigValue
              state={shapeFillColorConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <ColorConfigSourceToggleGroup
              state={shapeFillColorConfigWidgetState}
              className="border rounded"
            />
            <ColorConfigWidget state={shapeFillColorConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape fill visibility */}
        <AccordionItem value="shapeFillVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill visibility</AccordionTrigger>
            <ActiveVisibilityConfigValue
              state={shapeFillVisibilityConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <VisibilityConfigSourceToggleGroup
              state={shapeFillVisibilityConfigWidgetState}
              className="border rounded"
            />
            <VisibilityConfigWidget
              state={shapeFillVisibilityConfigWidgetState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape fill opacity */}
        <AccordionItem value="shapeFillOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill opacity</AccordionTrigger>
            <ActiveOpacityConfigValue
              state={shapeFillOpacityConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <OpacityConfigSourceToggleGroup
              state={shapeFillOpacityConfigWidgetState}
              className="border rounded"
            />
            <OpacityConfigWidget state={shapeFillOpacityConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape stroke color */}
        <AccordionItem value="shapeStrokeColor">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke color</AccordionTrigger>
            <ActiveColorConfigValue
              state={shapeStrokeColorConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <ColorConfigSourceToggleGroup
              state={shapeStrokeColorConfigWidgetState}
              className="border rounded"
            />
            <ColorConfigWidget state={shapeStrokeColorConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape stroke visibility */}
        <AccordionItem value="shapeStrokeVisibility">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke visibility</AccordionTrigger>
            <ActiveVisibilityConfigValue
              state={shapeStrokeVisibilityConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <VisibilityConfigSourceToggleGroup
              state={shapeStrokeVisibilityConfigWidgetState}
              className="border rounded"
            />
            <VisibilityConfigWidget
              state={shapeStrokeVisibilityConfigWidgetState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Shape stroke opacity */}
        <AccordionItem value="shapeStrokeOpacity">
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke opacity</AccordionTrigger>
            <ActiveOpacityConfigValue
              state={shapeStrokeOpacityConfigWidgetState}
              className="ml-auto text-sm text-slate-600 dark:text-slate-400"
            />
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <OpacityConfigSourceToggleGroup
              state={shapeStrokeOpacityConfigWidgetState}
              className="border rounded"
            />
            <OpacityConfigWidget state={shapeStrokeOpacityConfigWidgetState} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Fieldset>
  );
}
