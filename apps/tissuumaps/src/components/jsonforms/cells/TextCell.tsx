import { type CellProps } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";

import { Input } from "@/components/ui/input";

export const TextCell = withJsonFormsCellProps((props: CellProps) => {
  const options = {
    ...(props.config as { [key: string]: unknown }),
    ...props.uischema.options,
  };
  return (
    <Input
      type="text"
      id={props.id}
      value={(props.data as string | undefined | null) ?? ""}
      onChange={(event) =>
        props.handleChange(
          props.path,
          event.target.value === "" ? undefined : event.target.value,
        )
      }
      disabled={!props.enabled}
      autoFocus={options.focus as boolean | undefined}
      placeholder={options.placeholder as string | undefined}
      maxLength={props.schema.maxLength}
    />
  );
});
