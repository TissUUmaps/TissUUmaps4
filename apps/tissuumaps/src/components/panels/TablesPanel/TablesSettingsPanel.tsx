import { type Table } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";

export type TablesSettingsPanelProps = {
  table: Table;
  className?: string;
};

export function TablesSettingsPanel({
  table,
  className,
}: TablesSettingsPanelProps) {
  const updateTable = useTissUUmaps((state) => state.updateTable);

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
