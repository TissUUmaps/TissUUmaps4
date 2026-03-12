import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { markers } from "./markers";
import { type MarkerConfigControlState } from "./useMarkerConfigControl";

export type ConstantMarkerConfigControlProps = {
  state: MarkerConfigControlState;
  className?: string;
};

export function ConstantMarkerConfigControl({
  state,
  className,
}: ConstantMarkerConfigControlProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    state;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Marker</FieldLabel>
        <SimpleSelect
          items={markers}
          itemLabel={(marker) => (
            <>
              {marker.icon} {marker.label}
            </>
          )}
          itemValue={(marker) => marker.value}
          value={value}
          onValueChange={(value) => {
            if (value !== null) {
              setValue(value);
            }
          }}
        />
      </Field>
    </div>
  );
}
