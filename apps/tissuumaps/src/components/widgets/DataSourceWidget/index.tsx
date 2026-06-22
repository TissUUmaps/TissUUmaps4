import { createAjv } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { EditIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  type Data,
  type DataProvider,
  type DataSource,
} from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { SimpleSelect } from "@/components/common/simple-select";
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
  const isEditing = dataSourceDraft !== null;

  const providerEntries = useMemo(
    () => Array.from(dataProviders.entries()),
    [dataProviders],
  );

  const dataProvider = dataProviders.get(currentDataSource.type);
  if (dataProvider === undefined) {
    throw new Error(
      `No data provider registered for data source type "${currentDataSource.type}"`,
    );
  }

  // Validate the current draft against the active provider's schema using the
  // same Ajv config JsonForms uses, so shared fields (e.g. URL) carry over and
  // validity is re-checked on every edit or type switch instead of being reset.
  const ajv = useMemo(() => createAjv(), []);
  const validate = useMemo(
    () => ajv.compile(dataProvider.schema),
    [ajv, dataProvider.schema],
  );
  const hasErrors = !validate(currentDataSource);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="flex flex-row items-center gap-x-1 font-medium text-foreground">
        {isEditing ? (
          <>
            Source:
            <SimpleSelect
              items={providerEntries}
              itemLabel={([, provider]) => provider.name}
              itemValue={([type]) => type}
              value={currentDataSource.type}
              onValueChange={(value) => {
                if (value !== null) {
                  setDataSourceDraft({
                    ...dataSourceDraft,
                    type: value,
                  } as TDataSource);
                }
              }}
            />
          </>
        ) : (
          <>Source: {dataProvider.name}</>
        )}
        {isEditing ? (
          <span className="ml-auto flex flex-row">
            <Button
              variant="ghost"
              title="Reset"
              onClick={() => setDataSourceDraft(structuredClone(dataSource))}
            >
              <RotateCcwIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              title="Save"
              disabled={hasErrors}
              onClick={() => {
                const knownKeys = new Set([
                  "type",
                  ...Object.keys(dataProvider.schema.properties ?? {}),
                ]);
                const cleaned = Object.fromEntries(
                  Object.entries(dataSourceDraft).filter(([k]) =>
                    knownKeys.has(k),
                  ),
                ) as TDataSource;
                onDataSourceChange(cleaned);
                setDataSourceDraft(null);
              }}
            >
              <SaveIcon className="size-4" />
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              setDataSourceDraft(structuredClone(dataSource));
            }}
          >
            <EditIcon className="size-4" />
          </Button>
        )}
      </FieldsetLegend>
      <JsonForms
        data={currentDataSource}
        onChange={({ data }) => {
          if (isEditing) {
            setDataSourceDraft(data as TDataSource);
          }
        }}
        schema={dataProvider.schema}
        uischema={dataProvider.uischema}
        renderers={renderers}
        cells={cells}
        readonly={!isEditing}
      />
    </Fieldset>
  );
}
