import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Shapes, type ShapesDataSource } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import { cells, renderers } from "../../jsonforms";

export function ShapesSourcePanel({
  shapes,
  className,
}: {
  shapes: Shapes;
  className?: string;
}) {
  const createShapesDataLoader = useTissUUmaps(
    (state) => state.createShapesDataLoader,
  );

  const updateShapes = useTissUUmaps((state) => state.updateShapes);
  const shapesDataLoader = useMemo(
    () => createShapesDataLoader(shapes.id),
    [createShapesDataLoader, shapes.id],
  );

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
        schema={shapesDataLoader.schema}
        uischema={shapesDataLoader.uischema}
        data={shapes.dataSource}
        renderers={renderers}
        onChange={({ data, errors }) => {
          if (errors === undefined || errors.length === 0) {
            updateShapes(shapes.id, {
              dataSource: {
                ...shapes.dataSource,
                ...(data as ShapesDataSource),
              },
            });
          }
        }}
        cells={cells}
      />
    </Fieldset>
  );
}
