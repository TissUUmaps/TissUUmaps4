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
} & Omit<
  SelectPrimitive.Root.Props<TValue, TMultiple>,
  "items" | "itemToStringLabel" | "itemToStringValue"
>;

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
      <SelectPrimitive.Trigger className="flex w-full h-10 min-w-40 items-center justify-between gap-3 rounded-md border border-gray-200 pr-3 pl-3.5 text-base bg-[canvas] text-gray-900 select-none hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 data-popup-open:bg-gray-100 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-300">
        <SelectPrimitive.Value className="data-placeholder:opacity-60" />
        <SelectPrimitive.Icon className="flex">
          <ChevronsUpDownIcon />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          className="outline-none select-none z-10"
          sideOffset={8}
        >
          <SelectPrimitive.Popup
            className="group min-w-full bg-clip-padding rounded-md bg-[canvas] text-gray-900 shadow-lg shadow-gray-200 outline-1 outline-gray-200 transition-transform transition-opacity transition-scale dark:bg-gray-900 dark:text-gray-100 dark:shadow-none dark:outline-gray-300"
            style={{
              minWidth: "var(--anchor-width)",
              transformOrigin: "var(--transform-origin)",
            }}
          >
            <SelectPrimitive.ScrollUpArrow className="top-0 z-1 flex h-4 w-full cursor-default items-center justify-center rounded-md bg-[canvas] text-center text-xs before:absolute before:left-0 before:h-full before:w-full before:content-[''] data-side=none:before:top-[-100%] dark:bg-gray-900 dark:text-gray-100" />
            <SelectPrimitive.List
              className="relative py-1 scroll-py-6 overflow-y-auto dark:bg-gray-900"
              style={{ maxHeight: "var(--available-height)" }}
            >
              {memoizedItems.map(({ label, value }) => (
                <SelectPrimitive.Item
                  key={label}
                  value={value}
                  className="grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none group-data-[side=none]:pr-12 group-data-[side=none]:text-base group-data-[side=none]:leading-4 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-gray-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-gray-900 pointer-coarse:py-2.5 pointer-coarse:text-[0.925rem]"
                >
                  <SelectPrimitive.ItemIndicator className="col-start-1">
                    <CheckIcon className="size-3" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="col-start-2">
                    {label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
            <SelectPrimitive.ScrollDownArrow className="bottom-0 z-1 flex h-4 w-full cursor-default items-center justify-center rounded-md bg-[canvas] text-center text-xs before:absolute before:left-0 before:h-full before:w-full before:content-[''] data-side=none:before:bottom-[-100%] dark:bg-gray-900 dark:text-gray-100" />
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
