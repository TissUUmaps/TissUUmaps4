import { type CoordinateSpace } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Field, FieldItem, FieldLabel } from "../../common/field";
import { type SizeConfigWidgetState } from "./useSizeConfigWidget";

export type ConstantSizeConfigWidgetProps = {
  state: SizeConfigWidgetState;
  className?: string;
};

export function ConstantSizeConfigWidget({
  state,
  className,
}: ConstantSizeConfigWidgetProps) {
  const {
    currentConstantValue: value,
    currentConstantUnit: unit,
    setCurrentConstantValue: setValue,
    setCurrentConstantUnit: setUnit,
  } = state;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Size</FieldLabel>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => setValue(Math.max(0, +event.target.value))}
        />
      </Field>
      <Field>
        <FieldLabel>Size unit</FieldLabel>
        <RadioGroup
          value={unit}
          onValueChange={(value) => setUnit(value as CoordinateSpace)}
          className="flex gap-x-4"
        >
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"data" satisfies CoordinateSpace} />
            <FieldLabel>Data</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
            <FieldLabel>Layer</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"world" satisfies CoordinateSpace} />
            <FieldLabel>World</FieldLabel>
          </FieldItem>
        </RadioGroup>
      </Field>
    </div>
  );
}
