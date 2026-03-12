import { colorPalettes } from "@tissuumaps/core";

import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { type ColorConfigControlState } from "./useColorConfigControl";

export type RandomColorConfigControlProps = {
  state: ColorConfigControlState;
  className?: string;
};

export function RandomColorConfigControl({
  state,
  className,
}: RandomColorConfigControlProps) {
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
