import { type SimilarityTransform } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type TransformSettingsWidgetProps = {
  transform: SimilarityTransform;
  onTransformChange: (transform: SimilarityTransform) => void;
  className?: string;
};

export function TransformSettingsWidget({
  transform,
  onTransformChange,
  className,
}: TransformSettingsWidgetProps) {
  return (
    <div className={className}>
      <Field>
        <FieldLabel>Flip</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch
            checked={transform.flip}
            onCheckedChange={(checked: boolean) =>
              onTransformChange({ ...transform, flip: checked })
            }
          />
          {transform.flip ? "Yes" : "No"}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        <Field>
          <FieldLabel>Scale</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={0.1}
            value={transform.scale}
            onChange={(e) => {
              const newValue = e.target.valueAsNumber;
              if (!isNaN(newValue)) {
                onTransformChange({
                  ...transform,
                  scale: newValue,
                });
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Rotation (&deg;)</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={1}
            value={transform.rotation}
            onChange={(e) => {
              const newValue = e.target.valueAsNumber;
              if (!isNaN(newValue)) {
                onTransformChange({
                  ...transform,
                  rotation: newValue,
                });
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Translate X</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={1}
            value={transform.translation.x}
            onChange={(e) => {
              const newValue = e.target.valueAsNumber;
              if (!isNaN(newValue)) {
                onTransformChange({
                  ...transform,
                  translation: {
                    ...transform.translation,
                    x: newValue,
                  },
                });
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Translate Y</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            step={1}
            value={transform.translation.y}
            onChange={(e) => {
              const newValue = e.target.valueAsNumber;
              if (!isNaN(newValue)) {
                onTransformChange({
                  ...transform,
                  translation: {
                    ...transform.translation,
                    y: newValue,
                  },
                });
              }
            }}
          />
        </Field>
      </div>
    </div>
  );
}
