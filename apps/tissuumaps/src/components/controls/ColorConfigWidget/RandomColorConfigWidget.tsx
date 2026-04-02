import { colorPalettes } from "@tissuumaps/core";

import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { type ColorConfigWidgetState } from "./useColorConfigWidget";

export type RandomColorConfigWidgetProps = {
  state: ColorConfigWidgetState;
  className?: string;
};

export function RandomColorConfigWidget({
  state,
  className,
}: RandomColorConfigWidgetProps) {
  const { currentRandomPalette: palette, setCurrentRandomPalette: setPalette } =
    state;
  return (
    <div className={className}>
      <Field>
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
        />
      </Field>
    </div>
  );
}
