import { JsonForms } from "@jsonforms/react";
import { EditIcon, SaveIcon } from "lucide-react";
import { useState } from "react";

import {
  type Data,
  type DataProvider,
  type DataSource,
} from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { cells } from "./cells";
import { renderers } from "./renderers";

export type DataSourceWidgetProps<TDataSource extends DataSource> = {
  dataSource: TDataSource;
  dataProviders: Map<string, DataProvider<DataSource, Data>>;
  onDataSourceChange: (newDataSource: TDataSource) => void;
  className?: string;
};

export function DataSourceWidget<TDataSource extends DataSource>({
  dataSource,
  dataProviders,
  onDataSourceChange,
  className,
}: DataSourceWidgetProps<TDataSource>) {
  const [dataSourceDraft, setDataSourceDraft] = useState<TDataSource | null>(
    null,
  );
  const currentDataSource = dataSourceDraft ?? dataSource;

  const dataProvider = dataProviders.get(currentDataSource.type);
  if (dataProvider === undefined) {
    throw new Error(
      `No data provider registered for data source type "${currentDataSource.type}"`,
    );
  }

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="flex flex-row items-center font-medium text-foreground">
        Source: {dataProvider.name}
        {dataSourceDraft === null ? (
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => setDataSourceDraft(structuredClone(dataSource))}
          >
            <EditIcon className=" size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              onDataSourceChange(dataSourceDraft);
              setDataSourceDraft(null);
            }}
          >
            <SaveIcon className="size-4" />
          </Button>
        )}
      </FieldsetLegend>
      <JsonForms
        data={currentDataSource}
        onChange={({ data }) => {
          if (dataSourceDraft !== null) {
            setDataSourceDraft(data as TDataSource);
          }
        }}
        schema={dataProvider.schema}
        uischema={dataProvider.uischema}
        renderers={renderers}
        cells={cells}
        readonly={dataSourceDraft === null}
      />
    </Fieldset>
  );
}
