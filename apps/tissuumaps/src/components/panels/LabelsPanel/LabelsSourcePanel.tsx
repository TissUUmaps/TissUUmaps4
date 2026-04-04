import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Labels } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cells, renderers } from "@/components/jsonforms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type LabelsSourcePanelProps = {
  labels: Labels;
  className?: string;
};

export function LabelsSourcePanel({
  labels,
  className,
}: LabelsSourcePanelProps) {
  const labelsDataProviders = useTissUUmaps(
    (state) => state.labelsDataProviders,
  );

  const labelsDataProvider = useMemo(() => {
    const labelsDataProvider = labelsDataProviders.get(labels.dataSource.type);
    if (labelsDataProvider === undefined) {
      throw new Error(
        `No labels data provider registered for data source type "${labels.dataSource.type}"`,
      );
    }
    return labelsDataProvider;
  }, [labelsDataProviders, labels.dataSource.type]);

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
        <Input type="text" value={labels.dataSource.type} disabled />
      </Field>
      <JsonForms
        schema={labelsDataProvider.schema}
        uischema={labelsDataProvider.uiSchema}
        data={labels.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
