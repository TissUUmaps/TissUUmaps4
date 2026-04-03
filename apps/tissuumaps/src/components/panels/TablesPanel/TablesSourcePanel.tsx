import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Table } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cells, renderers } from "@/components/jsonforms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type TablesSourcePanelProps = {
  table: Table;
  className?: string;
};

export function TablesSourcePanel({
  table,
  className,
}: TablesSourcePanelProps) {
  const tableDataProviders = useTissUUmaps((state) => state.tableDataProviders);

  const tableDataProvider = useMemo(() => {
    const tableDataProvider = tableDataProviders.get(table.dataSource.type);
    if (tableDataProvider === undefined) {
      throw new Error(
        `No table data provider registered for data source type "${table.dataSource.type}"`,
      );
    }
    return tableDataProvider;
  }, [tableDataProviders, table.dataSource.type]);

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
        schema={tableDataProvider.schema}
        uischema={tableDataProvider.uiSchema}
        data={table.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
