import { JsonForms } from "@jsonforms/react";
import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";

import {
  type Data,
  type DataProvider,
  type DataSource,
} from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset } from "@/components/common/fieldset";
import { SimpleSelect } from "@/components/common/simple-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { cells } from "../DataSourceWidget/cells";
import { renderers } from "../DataSourceWidget/renderers";

export type AddDataObjectDialogProps<
  TDataSource extends DataSource = DataSource,
> = {
  title: string;
  dataProviders: Map<string, DataProvider<TDataSource, Data>>;
  onAdd: (
    name: string,
    dataSourceType: string,
    dataSource: TDataSource,
  ) => void;
};

export function AddDataObjectDialog<TDataSource extends DataSource>({
  title,
  dataProviders,
  onAdd,
}: AddDataObjectDialogProps<TDataSource>) {
  const providerEntries = Array.from(dataProviders.entries());

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState(
    providerEntries[0]?.[0] ?? "",
  );
  const [dataSourceDraft, setDataSourceDraft] = useState<TDataSource>({
    type: selectedType,
  } as TDataSource);

  const resetForm = useCallback(() => {
    const defaultType = providerEntries[0]?.[0] ?? "";
    setName("");
    setSelectedType(defaultType);
    setDataSourceDraft({ type: defaultType } as TDataSource);
  }, [providerEntries]);

  const handleTypeChange = useCallback((value: string | null) => {
    if (value == null) return;
    setSelectedType(value);
    setDataSourceDraft({ type: value } as TDataSource);
  }, []);

  const handleAdd = useCallback(() => {
    onAdd(name.trim() || "Untitled", selectedType, dataSourceDraft);
    setOpen(false);
    resetForm();
  }, [name, selectedType, dataSourceDraft, onAdd, resetForm]);

  const selectedProvider = dataProviders.get(selectedType);

  if (providerEntries.length === 0) {
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" className="w-full" />}
        onClick={() => resetForm()}
      >
        <PlusIcon className="size-4" />
        Add
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Fieldset className="flex flex-col gap-4">
          <Field className="flex flex-col gap-2">
            <FieldLabel>Name</FieldLabel>
            <Input
              type="text"
              placeholder="Enter a name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          {providerEntries.length >= 1 && (
            <Field className="flex flex-col gap-2">
              <FieldLabel>Source type</FieldLabel>
              <SimpleSelect
                items={providerEntries}
                itemLabel={([, provider]) => provider.name}
                itemValue={([type]) => type}
                value={selectedType}
                onValueChange={handleTypeChange}
              />
            </Field>
          )}

          {selectedProvider && (
            <Field className="flex flex-col gap-2">
              <FieldLabel>Configuration</FieldLabel>
              <JsonForms
                data={dataSourceDraft}
                onChange={({ data }) => setDataSourceDraft(data as TDataSource)}
                schema={selectedProvider.schema}
                uischema={selectedProvider.uischema}
                renderers={renderers}
                cells={cells}
              />
            </Field>
          )}
        </Fieldset>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleAdd}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
