import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/project";

export function ProjectSettingsDialog() {
  const glOptions = useProjectStore((state) => state.glOptions);
  const setGLOptions = useProjectStore((state) => state.setGLOptions);

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
                value={glOptions.pointsRenderOptions.globalPointSizeFactor}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setGLOptions({
                      ...glOptions,
                      pointsRenderOptions: {
                        ...glOptions.pointsRenderOptions,
                        globalPointSizeFactor: Math.max(0, newValue),
                      },
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
          <FieldLabel>Shape Stroke Width</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                min={0}
                value={glOptions.shapesRenderOptions.strokeWidth}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setGLOptions({
                      ...glOptions,
                      shapesRenderOptions: {
                        ...glOptions.shapesRenderOptions,
                        strokeWidth: Math.max(0, Math.trunc(newValue)),
                      },
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Stroke width for shape outlines, in world coordinates
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Shape Edges per Scanline</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                inputMode="decimal"
                step={1}
                min={1}
                value={glOptions.shapesRenderOptions.edgesPerScanline}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setGLOptions({
                      ...glOptions,
                      shapesRenderOptions: {
                        ...glOptions.shapesRenderOptions,
                        edgesPerScanline: Math.max(1, newValue),
                      },
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Number of outline edges of a typical shape per rasterization
            scanline (fewer is faster, but uses more memory)
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Shape Bin Width Factor</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0.1}
                value={glOptions.shapesRenderOptions.binWidthFactor}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setGLOptions({
                      ...glOptions,
                      shapesRenderOptions: {
                        ...glOptions.shapesRenderOptions,
                        binWidthFactor: Math.max(0.1, newValue),
                      },
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Width of the rasterization scanline bins, relative to the median
            shape width (smaller is faster, but uses more memory)
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Shape Padding</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                value={glOptions.shapesRenderOptions.shapePadding}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    setGLOptions({
                      ...glOptions,
                      shapesRenderOptions: {
                        ...glOptions.shapesRenderOptions,
                        shapePadding: Math.max(0, newValue),
                      },
                    });
                  }
                }}
              />
            }
          />
          <FieldDescription className="text-xs text-muted-foreground">
            Padding of the shapes in the rasterization scanlines and bins, as a
            fraction of the median shape size (larger lets strokes reach
            further, but is slower and uses more memory)
          </FieldDescription>
        </Field>
      </div>
    </Fieldset>
  );
}
