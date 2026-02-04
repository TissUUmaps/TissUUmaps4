import { Switch } from "@/components/ui/switch";
import type { CellProps } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";

export const BooleanCell = withJsonFormsCellProps((props: CellProps) => {
  const options = {
    ...(props.config as { [key: string]: unknown }),
    ...props.uischema.options,
  };
  return (
    <Switch
      id={props.id}
      checked={!!props.data}
      onCheckedChange={(checked) => props.handleChange(props.path, checked)}
      disabled={!props.enabled}
      autoFocus={options.focus as boolean | undefined}
    />
  );
});
