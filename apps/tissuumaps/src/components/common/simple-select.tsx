import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo } from "react";

export type SimpleSelectProps<
  TItem,
  TValue,
  TMultiple extends boolean | undefined = false,
> = {
  items: TItem[];
  itemLabel: (item: TItem) => string;
  itemValue: (item: TItem) => TValue;
} & Omit<SelectPrimitive.Root.Props<TValue, TMultiple>, "items">;

export function SimpleSelect<
  TItem,
  TValue,
  TMultiple extends boolean | undefined = false,
>({
  items,
  itemLabel,
  itemValue,
  ...props
}: SimpleSelectProps<TItem, TValue, TMultiple>) {
  const memoizedItems = useMemo(
    () =>
      items.map((item) => ({
        label: itemLabel(item),
        value: itemValue(item),
      })),
    [items, itemLabel, itemValue],
  );
  return (
    <SelectPrimitive.Root items={memoizedItems} {...props}>
      <SelectPrimitive.Trigger className="flex flex-row items-center justify-between border rounded-md px-2 py-1">
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronsUpDownIcon />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner>
          <SelectPrimitive.Popup>
            <SelectPrimitive.ScrollUpArrow />
            <SelectPrimitive.List>
              {memoizedItems.map(({ label, value }, index) => (
                <SelectPrimitive.Item
                  key={index}
                  value={value}
                  className="grid grid-cols-2 items-center"
                >
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
            <SelectPrimitive.ScrollDownArrow />
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
