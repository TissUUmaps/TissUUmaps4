import type { Table } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/project";

export type TableSettingsWidgetProps = {
  table: Table;
  className?: string;
};

export function TableSettingsWidget({
  table,
  className,
}: TableSettingsWidgetProps) {
  const updateTable = useProjectStore((state) => state.updateTable);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Settings
      </FieldsetLegend>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          value={table.name}
          onChange={(event) =>
            updateTable(table.id, { name: event.target.value })
          }
        />
      </Field>
    </Fieldset>
  );
}
