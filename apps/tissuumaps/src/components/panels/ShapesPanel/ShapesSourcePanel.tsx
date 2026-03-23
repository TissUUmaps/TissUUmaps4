import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Shapes } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import { cells, renderers } from "../../jsonforms";

export type ShapesSourcePanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesSourcePanel({
  shapes,
  className,
}: ShapesSourcePanelProps) {
  const shapesDataStorageRegistry = useTissUUmaps(
    (state) => state.shapesDataStorageRegistry,
  );

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = shapesDataStorageRegistry.get(shapes.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No shapes data storage adapter registered for data source type "${shapes.dataSource.type}"`,
      );
    }
    return value;
  }, [shapesDataStorageRegistry, shapes.dataSource.type]);

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
        <Input type="text" value={shapes.dataSource.type} disabled />
      </Field>
      <JsonForms
        schema={dataSourceSchema}
        uischema={dataSourceUISchema}
        data={shapes.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
