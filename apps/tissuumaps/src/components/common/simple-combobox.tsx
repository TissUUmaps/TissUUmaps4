import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

export type SimpleComboboxProps<
  TItem,
  TValue,
  TMultiple extends boolean | undefined = false,
> = {
  items: TItem[];
  itemLabel: (item: TItem) => string;
  itemValue: (item: TItem) => TValue;
} & Omit<
  ComboboxPrimitive.Root.Props<TValue, TMultiple>,
  "items" | "itemToStringLabel" | "itemToStringValue"
>;

export function SimpleCombobox<
  TItem,
  TValue,
  TMultiple extends boolean | undefined = false,
>({
  items,
  itemLabel,
  itemValue,
  ...props
}: SimpleComboboxProps<TItem, TValue, TMultiple>) {
  return (
    <ComboboxPrimitive.Root items={items} {...props}>
      <div className="flex flex-row items-center justify-between border rounded-md px-2 py-1">
        <ComboboxPrimitive.Input />
        <div className="flex flex-row items-center">
          <ComboboxPrimitive.Clear>
            <XIcon />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger>
            <ChevronDownIcon />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner>
          <ComboboxPrimitive.Popup>
            <ComboboxPrimitive.Empty>Not found</ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {items &&
                items.map((item, index) => (
                  <ComboboxPrimitive.Item
                    key={index}
                    value={itemValue(item)}
                    className="grid grid-cols-2 items-center"
                  >
                    <ComboboxPrimitive.ItemIndicator>
                      <CheckIcon />
                    </ComboboxPrimitive.ItemIndicator>
                    <div>{itemLabel(item)}</div>
                  </ComboboxPrimitive.Item>
                ))}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export type SimpleSearchableComboboxProps<TItem> = {
  getItem: (query: string) => TItem | null;
  suggestQueries: (currentQuery: string) => string[];
  onSelectedItemChange?: (item: TItem | null) => void;
} & Omit<
  ComboboxPrimitive.Root.Props<string, false>,
  "filter" | "items" | "inputValue" | "onInputValueChange" | "onValueChange"
>;

export function SimpleSearchableCombobox<TItem>({
  getItem,
  suggestQueries,
  onSelectedItemChange,
  ...props
}: SimpleSearchableComboboxProps<TItem>) {
  const [inputValue, setInputValue] = useState<string>("");
  const [queries, setQueries] = useState<string[]>(suggestQueries(""));
  const [selectedItem, setSelectedItem] = useState<TItem | null>(null);

  const updateSelectedItem = useCallback(
    (newSelectedItem: TItem | null) => {
      if (newSelectedItem !== selectedItem) {
        setSelectedItem(newSelectedItem);
        if (onSelectedItemChange !== undefined) {
          onSelectedItemChange(newSelectedItem);
        }
      }
    },
    [selectedItem, onSelectedItemChange],
  );

  const handleInputValueChange = useCallback(
    (inputValue: string) => {
      updateSelectedItem(getItem(inputValue));
      setQueries(suggestQueries(inputValue));
      setInputValue(inputValue);
    },
    [getItem, suggestQueries, updateSelectedItem],
  );

  const handleValueChange = useCallback(
    (selectedQuery: string | null) => {
      if (selectedQuery !== null) {
        updateSelectedItem(getItem(selectedQuery));
        setQueries(suggestQueries(selectedQuery));
        setInputValue(selectedQuery);
      } else {
        updateSelectedItem(null);
        setQueries(suggestQueries(""));
        setInputValue("");
      }
    },
    [getItem, suggestQueries, updateSelectedItem],
  );

  return (
    <ComboboxPrimitive.Root
      filter={null}
      items={queries}
      inputValue={inputValue}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
      {...props}
    >
      <div className="flex flex-row items-center justify-between border rounded-md px-2 py-1">
        <ComboboxPrimitive.Input />
        <div className="flex flex-row items-center">
          <ComboboxPrimitive.Clear>
            <XIcon />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger>
            <ChevronDownIcon />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner>
          <ComboboxPrimitive.Popup>
            <ComboboxPrimitive.Empty>Not found</ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {/* TODO virtualize */}
              {queries.map((query, index) => (
                <ComboboxPrimitive.Item
                  key={index}
                  value={query}
                  className="grid grid-cols-2 items-center"
                >
                  <ComboboxPrimitive.ItemIndicator>
                    <CheckIcon />
                  </ComboboxPrimitive.ItemIndicator>
                  <div>{query}</div>
                </ComboboxPrimitive.Item>
              ))}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
