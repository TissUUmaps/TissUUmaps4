import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Image } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cells, renderers } from "@/components/jsonforms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type ImagesSourcePanelProps = {
  image: Image;
  className?: string;
};

export function ImagesSourcePanel({
  image,
  className,
}: ImagesSourcePanelProps) {
  const imageDataProviders = useTissUUmaps((state) => state.imageDataProviders);

  const imageDataProvider = useMemo(() => {
    const imageDataProvider = imageDataProviders.get(image.dataSource.type);
    if (imageDataProvider === undefined) {
      throw new Error(
        `No image data provider registered for data source type "${image.dataSource.type}"`,
      );
    }
    return imageDataProvider;
  }, [imageDataProviders, image.dataSource.type]);

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
        schema={imageDataProvider.schema}
        uischema={imageDataProvider.uiSchema}
        data={image.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
