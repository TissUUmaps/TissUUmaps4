import { Input } from "@/components/ui/input";
import { Square } from "lucide-react";

import { Field, FieldLabel } from "../../common/field";
import { SimpleColorPicker } from "../../common/simple-color-picker";
import { type ColorConfigControlState } from "./useColorConfigControl";

export type ConstantColorConfigControlProps = {
  state: ColorConfigControlState;
  className?: string;
};

export function ConstantColorConfigControl({
  state,
  className,
}: ConstantColorConfigControlProps) {
  const { currentConstantValue: color, setCurrentConstantValue: setColor } =
    state;

  return (
    <div className={className}>
      <div className="grid grid-cols-4 grid-flow-col gap-x-2 items-center">
        <Field className="contents">
          <FieldLabel>Red</FieldLabel>
          <Input
            type="number"
            min={0}
            max={255}
            value={color.r}
            onChange={(event) => {
              const r = event.target.valueAsNumber;
              if (Number.isFinite(r)) {
                setColor({
                  ...color,
                  r: Math.min(Math.max(0, r), 255),
                });
              }
            }}
          />
        </Field>
        <Field className="contents">
          <FieldLabel>Green</FieldLabel>
          <Input
            type="number"
            min={0}
            max={255}
            value={color.g}
            onChange={(event) => {
              const g = event.target.valueAsNumber;
              if (Number.isFinite(g)) {
                setColor({
                  ...color,
                  g: Math.min(Math.max(0, g), 255),
                });
              }
            }}
          />
        </Field>
        <Field className="contents">
          <FieldLabel>Blue</FieldLabel>
          <Input
            type="number"
            min={0}
            max={255}
            value={color.b}
            onChange={(event) => {
              const b = event.target.valueAsNumber;
              if (Number.isFinite(b)) {
                setColor({
                  ...color,
                  b: Math.min(Math.max(0, b), 255),
                });
              }
            }}
          />
        </Field>
        <SimpleColorPicker
          color={color}
          onColorChange={setColor}
          className="row-start-2 col-start-4"
        >
          <Square fill={`rgb(${color.r}, ${color.g}, ${color.b})`} /> Pick
        </SimpleColorPicker>
      </div>
    </div>
  );
}
