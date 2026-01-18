import { cn } from "@/lib/utils";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

export function SimpleSelect<TItem, TValue>({
  items,
  itemLabel,
  itemValue,
  value,
  onValueChange,
  className,
}: {
  items: TItem[];
  itemLabel: (item: TItem) => string;
  itemValue: (item: TItem) => TValue;
  value: TValue | null;
  onValueChange: (value: TValue | null) => void;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root
      items={items.map((item) => ({
        label: itemLabel(item),
        value: itemValue(item),
      }))}
      value={value}
      onValueChange={onValueChange}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex flex-row items-center justify-between border rounded-md px-2 py-1",
          className,
        )}
      >
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
              {items.map((item, index) => (
                <SelectPrimitive.Item
                  key={index}
                  value={itemValue(item)}
                  className="grid grid-cols-2 items-center"
                >
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>
                    {itemLabel(item)}
                  </SelectPrimitive.ItemText>
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
