import { Input } from "@/components/ui/input";

import { type Color } from "@tissuumaps/core";

import { ColorPicker } from "../../common/color-picker";
import { Field, FieldControl, FieldLabel } from "../../common/field";
import { useColorConfigContext } from "./context";

export { ColorConfigContextProvider } from "./ColorConfigContextProvider";

export function ColorConfigControl({
  defaultValue,
  className,
}: {
  defaultValue: Color;
  className?: string;
}) {
  const { currentSource } = useColorConfigContext();
  switch (currentSource) {
    case "value":
      return (
        <ColorConfigValueControl
          defaultValue={defaultValue}
          className={className}
        />
      );
    case "from":
      return <ColorConfigFromControl className={className} />;
    case "groupBy":
      return <ColorConfigGroupByControl className={className} />;
    case "random":
      return <ColorConfigRandomControl />;
  }
}

function ColorConfigValueControl({
  defaultValue,
  className,
}: {
  defaultValue: Color;
  className?: string;
}) {
  const { currentValue, setCurrentValue } = useColorConfigContext();

  return (
    <ColorPicker
      color={currentValue ?? defaultValue}
      onColorChange={setCurrentValue}
      className={className}
    />
  );
}

function ColorConfigFromControl({ className }: { className?: string }) {
  const {
    currentFromRangeMin,
    currentFromRangeMax,
    setCurrentFromRangeMin,
    setCurrentFromRangeMax,
  } = useColorConfigContext();

  return (
    <div className={className}>
      {/* TODO table select */}
      {/* TODO column combobox */}
      <div className="grid grid-cols-2">
        <Field>
          <FieldLabel>Min</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                value={currentFromRangeMin ?? ""}
                onChange={(event) =>
                  setCurrentFromRangeMin(
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            }
          />
        </Field>
        <Field>
          <FieldLabel>Max</FieldLabel>
          <FieldControl
            render={
              <Input
                type="number"
                value={currentFromRangeMax ?? ""}
                onChange={(event) =>
                  setCurrentFromRangeMax(
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              />
            }
          />
        </Field>
      </div>
      {/* TODO palette select */}
    </div>
  );
}

function ColorConfigGroupByControl({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* TODO table select */}
      {/* TODO column combobox */}
      {/* TODO map select */}
    </div>
  );
}

function ColorConfigRandomControl({ className }: { className?: string }) {
  return <div className={className}>{/* TODO palette select */}</div>;
}

export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";
