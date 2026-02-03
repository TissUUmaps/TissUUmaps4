import { type ControlProps } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";

import { useTissUUmaps } from "../../store";
import { Field, FieldLabel } from "../common/field";
import { SimpleSelect } from "../common/simple-select";

export const TableSelectRenderer = withJsonFormsControlProps(
  (props: ControlProps) => {
    const tables = useTissUUmaps((state) => state.tables);
    return (
      <Field>
        <FieldLabel>Table</FieldLabel>
        <SimpleSelect
          items={tables}
          itemLabel={(item) => item.name}
          itemValue={(item) => item.id}
          value={props.data as string}
          onValueChange={(value) => props.handleChange(props.path, value)}
        />
      </Field>
    );
  },
);
