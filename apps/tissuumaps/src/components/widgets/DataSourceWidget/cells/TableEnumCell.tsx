import type { CellProps } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";

import { SimpleSelect } from "@/components/common/simple-select";
import { useTissUUmaps } from "@/store";

export const TableEnumCell = withJsonFormsCellProps((props: CellProps) => {
  const tables = useTissUUmaps((state) => state.tables);
  return (
    <SimpleSelect
      id={props.id}
      value={props.data as string}
      onValueChange={(value) => props.handleChange(props.path, value)}
      items={tables}
      itemLabel={(item) => item.name}
      itemValue={(item) => item.id}
      disabled={!props.enabled}
    />
  );
});
