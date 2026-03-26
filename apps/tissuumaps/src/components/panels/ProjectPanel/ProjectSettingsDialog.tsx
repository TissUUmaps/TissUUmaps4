import { Input } from "@/components/ui/input";

import { useTissUUmaps } from "../../../store";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from "../../common/field";

export function ProjectSettingsDialog() {
  const drawOptions = useTissUUmaps((state) => state.drawOptions);
  const setDrawOptions = useTissUUmaps((state) => state.setDrawOptions);

  return (
    <form onSubmit={(e) => e.preventDefault()} aria-label="Project settings">
      <fieldset className="border-0 m-0 p-0">
        <legend className="mb-3 text-sm font-medium">Draw Options</legend>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Point Size Factor</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step={0.1}
                  value={drawOptions.pointSizeFactor}
                  onChange={(e) =>
                    setDrawOptions({
                      pointSizeFactor: parseFloat(e.target.value) || 1,
                    })
                  }
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
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={drawOptions.shapeStrokeWidth}
                  onChange={(e) =>
                    setDrawOptions({
                      shapeStrokeWidth: parseFloat(e.target.value) || 1,
                    })
                  }
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
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={drawOptions.numShapesScanlines}
                  onChange={(e) =>
                    setDrawOptions({
                      numShapesScanlines: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 1,
                      ),
                    })
                  }
                />
              }
            />
            <FieldDescription className="text-xs text-muted-foreground">
              Number of scanlines for shape rasterization (higher = more
              accurate but slower)
            </FieldDescription>
          </Field>
        </div>
      </fieldset>
    </form>
  );
}
