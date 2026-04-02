import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { markers } from "./markers";
import { type MarkerConfigWidgetState } from "./useMarkerConfigWidget";

export type ConstantMarkerConfigWidgetProps = {
  state: MarkerConfigWidgetState;
  className?: string;
};

export function ConstantMarkerConfigWidget({
  state,
  className,
}: ConstantMarkerConfigWidgetProps) {
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
