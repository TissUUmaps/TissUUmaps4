import { Input } from "@/components/ui/input";
import { type CellProps } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";

export const NumberCell = withJsonFormsCellProps((props: CellProps) => {
  const options = {
    ...(props.config as { [key: string]: unknown }),
    ...props.uischema.options,
  };
  return (
    <Input
      type="number"
      step="0.1"
      id={props.id}
      value={(props.data as string | number | undefined | null) ?? ""}
      onChange={(event) =>
        props.handleChange(
          props.path,
          event.target.value === "" ? undefined : Number(event.target.value),
        )
      }
      disabled={!props.enabled}
      autoFocus={options.focus as boolean | undefined}
    />
  );
});
