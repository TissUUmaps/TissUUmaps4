import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Image } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import { cells, renderers } from "../../jsonforms";

export type ImagesSourcePanelProps = {
  image: Image;
  className?: string;
};

export function ImagesSourcePanel({
  image,
  className,
}: ImagesSourcePanelProps) {
  const imageDataLoaderRegistry = useTissUUmaps(
    (state) => state.imageDataLoaderRegistry,
  );

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = imageDataLoaderRegistry.get(image.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No image data loader registered for data source type "${image.dataSource.type}"`,
      );
    }
    return value;
  }, [imageDataLoaderRegistry, image.dataSource.type]);

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
        <Input type="text" value={image.dataSource.type} disabled />
      </Field>
      <JsonForms
        schema={dataSourceSchema}
        uischema={dataSourceUISchema}
        data={image.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
