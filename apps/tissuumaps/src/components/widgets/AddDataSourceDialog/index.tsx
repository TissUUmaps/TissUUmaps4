import { JsonForms } from "@jsonforms/react";
import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";

import {
  type Data,
  type DataProvider,
  type DataSource,
} from "@tissuumaps/core";

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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { cells } from "../DataSourceWidget/cells";
import { renderers } from "../DataSourceWidget/renderers";

export type AddDataSourceDialogProps = {
  title: string;
  dataProviders: Map<string, DataProvider<DataSource, Data>>;
  onAdd: (name: string, dataSourceType: string, dataSource: DataSource) => void;
};

export function AddDataSourceDialog({
  title,
  dataProviders,
  onAdd,
}: AddDataSourceDialogProps) {
  const providerEntries = Array.from(dataProviders.entries());

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState(
    providerEntries[0]?.[0] ?? "",
  );
  const [dataSourceDraft, setDataSourceDraft] = useState<DataSource>({
    type: selectedType,
  });

  const resetForm = useCallback(() => {
    const defaultType = providerEntries[0]?.[0] ?? "";
    setName("");
    setSelectedType(defaultType);
    setDataSourceDraft({ type: defaultType });
  }, [providerEntries]);

  const handleTypeChange = useCallback((value: string) => {
    setSelectedType(value);
    setDataSourceDraft({ type: value });
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

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-datasource-name">Name</Label>
            <Input
              id="add-datasource-name"
              type="text"
              placeholder="Enter a name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {providerEntries.length >= 1 && (
            <div className="flex flex-col gap-2">
              <Label>Source type</Label>
              <RadioGroup value={selectedType} onValueChange={handleTypeChange}>
                {providerEntries.map(([type, provider]) => {
                  const radioId = `data-source-type-${type}`;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <RadioGroupItem id={radioId} value={type} />
                      <Label htmlFor={radioId}>{provider.name}</Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {selectedProvider && (
            <div className="flex flex-col gap-2">
              <Label>Configuration</Label>
              <JsonForms
                data={dataSourceDraft}
                onChange={({ data }) => setDataSourceDraft(data as DataSource)}
                schema={selectedProvider.schema}
                uischema={selectedProvider.uischema}
                renderers={renderers}
                cells={cells}
              />
            </div>
          )}
        </div>

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
