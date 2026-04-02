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
  const drawOptions = useTissUUmaps((state) => state.drawOptions);
  const setDrawOptions = useTissUUmaps((state) => state.setDrawOptions);

  return (
    <Fieldset className="border-0 m-0 p-0">
      <FieldsetLegend className="mb-3 text-sm font-medium">
        Draw Options
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
                value={drawOptions.pointSizeFactor}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    setDrawOptions({
                      pointSizeFactor: Math.max(
                        0,
                        parseFloat(event.target.value),
                      ),
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
                value={drawOptions.shapeStrokeWidth}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    setDrawOptions({
                      shapeStrokeWidth: Math.max(
                        0,
                        parseInt(event.target.value),
                      ),
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
                value={drawOptions.numShapesScanlines}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    setDrawOptions({
                      numShapesScanlines: Math.max(
                        1,
                        parseInt(event.target.value),
                      ),
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
