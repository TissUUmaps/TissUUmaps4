import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

export type SimpleAsyncComboboxProps<TItem> = {
  suggestQueries?: (currentQuery: string) => Promise<string[]>;
  getItem?: (query: string) => Promise<TItem | null>;
  item?: TItem | null;
  onItemChange?: (item: TItem | null) => void;
} & Omit<
  ComboboxPrimitive.Root.Props<string, false>,
  | "filter"
  | "items"
  | "value"
  | "onValueChange"
  | "inputValue"
  | "onInputValueChange"
>;

export function SimpleAsyncCombobox<TItem>({
  suggestQueries,
  getItem,
  item,
  onItemChange,
  ...props
}: SimpleAsyncComboboxProps<TItem>) {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [suggestedQueries, setSuggestedQueries] = useState<string[] | null>(
    null,
  );

  const [isSuggestedQueriesTransitionPending, startSuggestedQueriesTransition] =
    useTransition();
  const suggestedQueriesTransitionAbortControllerRef =
    useRef<AbortController | null>(null);
  const updateSuggestedQueries = useCallback(
    (currentQuery: string) => {
      suggestedQueriesTransitionAbortControllerRef.current?.abort();
      if (suggestQueries !== undefined) {
        const controller = new AbortController();
        suggestedQueriesTransitionAbortControllerRef.current = controller;
        startSuggestedQueriesTransition(async () => {
          const queries = await suggestQueries(currentQuery);
          if (!controller.signal.aborted) {
            startSuggestedQueriesTransition(() => setSuggestedQueries(queries));
          }
        });
      } else {
        suggestedQueriesTransitionAbortControllerRef.current = null;
        setSuggestedQueries([]);
      }
    },
    [suggestQueries],
  );

  const [, startSelectedItemTransition] = useTransition();
  const selectedItemTransitionAbortControllerRef =
    useRef<AbortController | null>(null);
  const updateSelectedItem = useCallback(
    (selectedQuery: string | null) => {
      selectedItemTransitionAbortControllerRef.current?.abort();
      if (selectedQuery !== null && getItem !== undefined) {
        const controller = new AbortController();
        selectedItemTransitionAbortControllerRef.current = controller;
        startSelectedItemTransition(async () => {
          const selectedItem = await getItem(selectedQuery);
          if (!controller.signal.aborted) {
            startSelectedItemTransition(() => onItemChange?.(selectedItem));
          }
        });
      } else {
        selectedItemTransitionAbortControllerRef.current = null;
        onItemChange?.(null);
      }
    },
    [getItem, onItemChange],
  );

  useEffect(() => {
    startSuggestedQueriesTransition(() => updateSuggestedQueries(""));
  }, [updateSuggestedQueries]);

  function getStatus() {
    if (isSuggestedQueriesTransitionPending) {
      return (
        <Fragment>
          <span
            aria-hidden
            className="inline-block size-3 animate-spin rounded-full border border-current border-r-transparent rtl:border-r-current rtl:border-l-transparent"
          />
          Searching...
        </Fragment>
      );
    }
    if (!currentQuery) {
      return item === null ? "Type to search" : null;
    }
    if (suggestedQueries !== null && suggestedQueries.length === 0) {
      return `No matches for "${currentQuery}"`;
    }
    return null;
  }

  function getEmptyMessage() {
    if (
      currentQuery &&
      suggestedQueries !== null &&
      suggestedQueries.length == 0 &&
      !isSuggestedQueriesTransitionPending
    ) {
      return "Try a different search term.";
    }
    return null;
  }

  return (
    <ComboboxPrimitive.Root
      filter={null}
      items={suggestedQueries ?? []}
      inputValue={currentQuery}
      onInputValueChange={(inputValue: string) => {
        updateSuggestedQueries(inputValue);
        setCurrentQuery(inputValue);
      }}
      onValueChange={(selectedValue: string | null) => {
        updateSelectedItem(selectedValue);
        setCurrentQuery("");
      }}
      {...props}
    >
      <div className="relative flex flex-col gap-1 text-sm font-medium leading-5 text-gray-900 w-[16rem] md:w-[20rem] [&>input]:pr-8 has-[.combobox-clear]:[&>input]:pr-[calc(0.5rem+1.5rem*2)]">
        <ComboboxPrimitive.Input className="box-border h-10 w-full rounded-md border border-gray-200 bg-[canvas] pl-3.5 text-base font-normal text-gray-900 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800" />
        <div className="absolute bottom-0 right-2 flex h-10 items-center justify-center text-gray-600">
          <ComboboxPrimitive.Clear
            className="combobox-clear flex h-10 w-6 items-center justify-center rounded border-0 bg-transparent p-0"
            aria-label="Clear selection"
          >
            <XIcon className="size-4" />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger
            className="flex h-10 w-6 items-center justify-center rounded border-0 bg-transparent p-0"
            aria-label="Open popup"
          >
            <ChevronDownIcon className="size-4" />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className="outline-none" sideOffset={4}>
          <ComboboxPrimitive.Popup
            className="box-border w-(--anchor-width) max-h-[min(var(--available-height),23rem)] max-w-(--available-width) origin-(--transform-origin) overflow-y-auto scroll-pb-2 scroll-pt-2 overscroll-contain rounded-md bg-[canvas] py-2 text-gray-900 shadow-[0_10px_15px_-3px_var(--color-gray-200),0_4px_6px_-4px_var(--color-gray-200)] outline outline-gray-200 transition-[transform,scale,opacity] data-ending-style:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 dark:-outline-offset-1 dark:shadow-none dark:outline-gray-300"
            aria-busy={isSuggestedQueriesTransitionPending || undefined}
          >
            <ComboboxPrimitive.Status className="flex items-center gap-2 py-1 pl-4 pr-5 text-sm text-gray-600 empty:hidden">
              {getStatus()}
            </ComboboxPrimitive.Status>
            <ComboboxPrimitive.Empty className="px-4 py-2 text-[0.875rem] leading-4 text-gray-600 empty:hidden">
              {getEmptyMessage()}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {suggestedQueries?.map((suggestedQuery, index) => (
                <ComboboxPrimitive.Item
                  key={index}
                  value={suggestedQuery}
                  className="grid cursor-default select-none grid-cols-[0.75rem_1fr] items-start gap-2 py-2 pl-4 pr-5 text-base leading-[1.2rem] outline-none [@media(hover:hover)]:data-highlighted:relative [@media(hover:hover)]:data-highlighted:z-0 [@media(hover:hover)]:data-highlighted:text-gray-900 [@media(hover:hover)]:data-highlighted:before:absolute [@media(hover:hover)]:data-highlighted:before:inset-y-0 [@media(hover:hover)]:data-highlighted:before:inset-x-2 [@media(hover:hover)]:data-highlighted:before:z-[-1] [@media(hover:hover)]:data-highlighted:before:rounded [@media(hover:hover)]:data-highlighted:before:bg-gray-100 [@media(hover:hover)]:data-highlighted:before:content-['']"
                >
                  <ComboboxPrimitive.ItemIndicator className="col-start-1 mt-1">
                    <CheckIcon className="size-3" />
                  </ComboboxPrimitive.ItemIndicator>
                  <div className="col-start-2 text-[0.8125rem] text-gray-600">
                    {suggestedQuery}
                  </div>
                </ComboboxPrimitive.Item>
              ))}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
