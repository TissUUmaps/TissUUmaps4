import { Switch } from "@/components/ui/switch";

import { Field, FieldLabel } from "../../common/field";
import { type VisibilityConfigControlState } from "./useVisibilityConfigControl";

export type ConstantVisibilityConfigControlProps = {
  state: VisibilityConfigControlState;
  className?: string;
};

export function ConstantVisibilityConfigControl({
  state,
  className,
}: ConstantVisibilityConfigControlProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    state;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Visibility</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch checked={value} onCheckedChange={setValue} />
          {value ? "Visible" : "Hidden"}
        </div>
      </Field>
    </div>
  );
}
