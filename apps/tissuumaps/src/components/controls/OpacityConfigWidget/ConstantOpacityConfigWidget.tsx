import { Input } from "@/components/ui/input";

import { Field, FieldLabel } from "../../common/field";
import { type OpacityConfigWidgetState } from "./useOpacityConfigWidget";

export type ConstantOpacityConfigWidgetProps = {
  state: OpacityConfigWidgetState;
  className?: string;
};

export function ConstantOpacityConfigWidget({
  state,
  className,
}: ConstantOpacityConfigWidgetProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    state;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Opacity</FieldLabel>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(event) => {
            const opacity = event.target.valueAsNumber;
            if (Number.isFinite(opacity)) {
              setValue(Math.min(Math.max(0, opacity), 1));
            }
          }}
        />
      </Field>
    </div>
  );
}
