import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useId } from "react";

import { type Color } from "@tissuumaps/core";

import { ColorPicker } from "../../common/ColorPicker";
import { useColorControlContext } from "./context";

export function ColorControl({
  defaultValue,
  className,
}: {
  defaultValue: Color;
  className?: string;
}) {
  const { currentSource } = useColorControlContext();
  switch (currentSource) {
    case "value":
      return (
        <ColorValueControl defaultValue={defaultValue} className={className} />
      );
    case "from":
      return <ColorFromControl className={className} />;
    case "groupBy":
      return <ColorGroupByControl className={className} />;
    case "random":
      return <ColorRandomControl />;
  }
}

function ColorValueControl({
  defaultValue,
  className,
}: {
  defaultValue: Color;
  className?: string;
}) {
  const { currentValue, setCurrentValue } = useColorControlContext();

  return (
    <ColorPicker
      color={currentValue ?? defaultValue}
      onColorChange={setCurrentValue}
      opacity={1} // TODO
      onOpacityChange={() => {
        // TODO
      }}
      className={className}
    />
  );
}

function ColorFromControl({ className }: { className?: string }) {
  const fromRangeMinId = useId();
  const fromRangeMaxId = useId();

  const {
    currentFromRangeMin,
    currentFromRangeMax,
    setCurrentFromRangeMin,
    setCurrentFromRangeMax,
  } = useColorControlContext();

  return (
    <div className={className}>
      {/* TODO table select */}
      {/* TODO column select */}
      <FieldGroup className="grid grid-cols-2">
        <Field>
          <FieldLabel htmlFor={fromRangeMinId}>Min</FieldLabel>
          <Input
            id={fromRangeMinId}
            type="number"
            value={currentFromRangeMin ?? ""}
            onChange={(event) =>
              setCurrentFromRangeMin(
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={fromRangeMaxId}>Max</FieldLabel>
          <Input
            id={fromRangeMaxId}
            type="number"
            value={currentFromRangeMax ?? ""}
            onChange={(event) =>
              setCurrentFromRangeMax(
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
          />
        </Field>
      </FieldGroup>
      {/* TODO palette select */}
    </div>
  );
}

function ColorGroupByControl({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* TODO table select */}
      {/* TODO column select */}
      {/* TODO map select */}
    </div>
  );
}

function ColorRandomControl({ className }: { className?: string }) {
  return <div className={className}>{/* TODO palette select */}</div>;
}
