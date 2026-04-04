import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Points } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { cells, renderers } from "@/components/jsonforms";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

export type PointsSourcePanelProps = {
  points: Points;
  className?: string;
};

export function PointsSourcePanel({
  points,
  className,
}: PointsSourcePanelProps) {
  const pointsDataProviders = useTissUUmaps(
    (state) => state.pointsDataProviders,
  );

  const pointsDataProvider = useMemo(() => {
    const pointsDataProvider = pointsDataProviders.get(points.dataSource.type);
    if (pointsDataProvider === undefined) {
      throw new Error(
        `No points data provider registered for data source type "${points.dataSource.type}"`,
      );
    }
    return pointsDataProvider;
  }, [pointsDataProviders, points.dataSource.type]);

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
        <Input type="text" value={points.dataSource.type} disabled />
      </Field>
      <JsonForms
        schema={pointsDataProvider.schema}
        uischema={pointsDataProvider.uiSchema}
        data={points.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
