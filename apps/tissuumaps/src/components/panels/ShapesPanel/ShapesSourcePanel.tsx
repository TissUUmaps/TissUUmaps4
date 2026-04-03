import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Shapes } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cells, renderers } from "@/components/jsonforms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type ShapesSourcePanelProps = {
  shapes: Shapes;
  className?: string;
};

export function ShapesSourcePanel({
  shapes,
  className,
}: ShapesSourcePanelProps) {
  const shapesDataProviders = useTissUUmaps(
    (state) => state.shapesDataProviders,
  );

  const shapesDataProvider = useMemo(() => {
    const shapesDataProvider = shapesDataProviders.get(shapes.dataSource.type);
    if (shapesDataProvider === undefined) {
      throw new Error(
        `No shapes data provider registered for data source type "${shapes.dataSource.type}"`,
      );
    }
    return shapesDataProvider;
  }, [shapesDataProviders, shapes.dataSource.type]);

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
        schema={shapesDataProvider.schema}
        uischema={shapesDataProvider.uiSchema}
        data={shapes.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
