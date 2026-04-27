import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";

export function ProjectSettingsDialog() {
  const renderOptions = useTissUUmaps((state) => state.renderOptions);
  const setRenderOptions = useTissUUmaps((state) => state.setRenderOptions);

  return (
    <Fieldset className="border-0 m-0 p-0">
      <FieldsetLegend className="mb-3 text-sm font-medium">
        Render Options
      </FieldsetLegend>

      <div className="space-y-4">
        <Field>
          <FieldLabel>Point Size Factor</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                value={renderOptions.pointSizeFactor}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setRenderOptions({
                      pointSizeFactor: Math.max(0, newValue),
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Global scaling factor for all point sizes
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Shape Stroke Width (px)</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                min={0}
                value={renderOptions.shapeStrokeWidth}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setRenderOptions({
                      shapeStrokeWidth: Math.max(0, Math.trunc(newValue)),
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Stroke width for shape outlines in pixels
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Shape Scanlines</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                min={1}
                value={renderOptions.numShapesScanlines}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setRenderOptions({
                      numShapesScanlines: Math.max(1, Math.trunc(newValue)),
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Number of scanlines for shape rasterization
          </FieldDescription>
        </Field>
      </div>
    </Fieldset>
  );
}
