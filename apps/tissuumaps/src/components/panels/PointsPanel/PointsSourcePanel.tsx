import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JsonForms } from "@jsonforms/react";
import { EditIcon } from "lucide-react";
import { useMemo } from "react";

import { type Points } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import { cells, renderers } from "../../jsonforms";

export type PointsSourcePanelProps = {
  points: Points;
  className?: string;
};

export function PointsSourcePanel({
  points,
  className,
}: PointsSourcePanelProps) {
  const createPointsDataLoader = useTissUUmaps(
    (state) => state.createPointsDataLoader,
  );

  const pointsDataLoader = useMemo(
    () => createPointsDataLoader(points.id),
    [createPointsDataLoader, points.id],
  );

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="flex flex-row items-center font-medium">
        Source
        <EditIcon className="ml-auto size-4" />
      </FieldsetLegend>
      <Field>
        <FieldLabel>Type</FieldLabel>
        <Input type="text" value={points.dataSource.type} disabled />
      </Field>
      <JsonForms
        schema={pointsDataLoader.schema}
        uischema={pointsDataLoader.uischema}
        data={points.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </Fieldset>
  );
}
