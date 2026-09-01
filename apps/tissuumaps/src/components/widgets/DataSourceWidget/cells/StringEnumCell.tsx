import type { EnumCellProps } from "@jsonforms/core";
import { withJsonFormsEnumCellProps } from "@jsonforms/react";

import { SimpleSelect } from "@/components/common/simple-select";

export const StringEnumCell = withJsonFormsEnumCellProps(
  (props: EnumCellProps) => {
    return (
      <SimpleSelect
        id={props.id}
        value={props.data as string}
        onValueChange={(value) => props.handleChange(props.path, value)}
        items={props.options || []}
        itemLabel={(option) => option.label}
        itemValue={(option) => option.value as string}
        disabled={!props.enabled}
      />
    );
  },
);
