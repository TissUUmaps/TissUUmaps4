import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Table } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import { cells, renderers } from "../../jsonforms";

export type TablesSourcePanelProps = {
  table: Table;
  className?: string;
};

export function TablesSourcePanel({
  table,
  className,
}: TablesSourcePanelProps) {
  const tableDataStorageRegistry = useTissUUmaps(
    (state) => state.tableDataStorageRegistry,
  );

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = tableDataStorageRegistry.get(table.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No table data storage adapter registered for data source type "${table.dataSource.type}"`,
      );
    }
    return value;
  }, [tableDataStorageRegistry, table.dataSource.type]);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="flex flex-row items-center font-medium text-foreground">
        Source
        <EditIcon className="ml-auto size-4" />
      </FieldsetLegend>
      <Field>
        <FieldLabel>Type</FieldLabel>
        <Input type="text" value={table.dataSource.type} disabled />
      </Field>
      <JsonForms
        schema={dataSourceSchema}
        uischema={dataSourceUISchema}
        data={table.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
