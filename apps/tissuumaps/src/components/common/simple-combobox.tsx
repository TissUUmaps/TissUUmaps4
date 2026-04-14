import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import { useControlled } from "@/hooks/useControlled";

export type SimpleAsyncComboboxProps<TItem> = {
  suggestQueries: (currentQuery: string) => Promise<string[]>;
  getItem: (query: string) => Promise<TItem | null>;
  itemQuery: (item: TItem) => string;
  selectedItem?: TItem | null;
  onSelectedItemChange?: (item: TItem | null) => void;
};

export function SimpleAsyncCombobox<TItem>({
  suggestQueries,
  getItem,
  itemQuery,
  selectedItem: controlledSelectedItem,
  onSelectedItemChange: setControlledSelectedItem,
}: SimpleAsyncComboboxProps<TItem>) {
  const [selectedItem, setSelectedItem] = useControlled(
    controlledSelectedItem,
    setControlledSelectedItem,
    null,
  );

  // selected query (derived from the selected item)
  const selectedQuery = useMemo(() => {
    if (selectedItem !== null) {
      return itemQuery(selectedItem);
    }
    return null;
  }, [selectedItem, itemQuery]);

  // current query being typed by the user (null = not searching)
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);

  // suggested queries based on the current query (null = not searching)
  const [suggestedQueries, setSuggestedQueries] = useState<string[] | null>(
    null,
  );

  // searching for suggested queries
  const [isSearchPending, startSearchTransition] = useTransition();
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const updateSuggestedQueries = useCallback(
    (currentQuery: string) => {
      searchAbortControllerRef.current?.abort();
      const controller = new AbortController();
      searchAbortControllerRef.current = controller;
      startSearchTransition(async () => {
        const suggestedQueries = await suggestQueries(currentQuery);
        if (!controller.signal.aborted) {
          startSearchTransition(() => setSuggestedQueries(suggestedQueries));
        }
      });
    },
    [suggestQueries],
  );

  // selecting an item based on the selected query
  const selectAbortControllerRef = useRef<AbortController | null>(null);
  const [isSelectPending, startSelectTransition] = useTransition();
  const handleSelectedQueryChanged = useCallback(
    (selectedQuery: string | null) => {
      selectAbortControllerRef.current?.abort();
      selectAbortControllerRef.current = null;
      if (selectedQuery !== null) {
        setCurrentQuery(selectedQuery);
        const controller = new AbortController();
        selectAbortControllerRef.current = controller;
        startSelectTransition(async () => {
          const newSelectedItem = await getItem(selectedQuery);
          if (!controller.signal.aborted && newSelectedItem !== null) {
            startSelectTransition(() => setSelectedItem(newSelectedItem));
          }
        });
      } else {
        setCurrentQuery(null);
        setSelectedItem(null);
      }
    },
    [getItem, setSelectedItem],
  );

  // current query (if searching) or selected query (if not searching)
  let currentOrSelectedQuery = "";
  if (currentQuery !== null) {
    currentOrSelectedQuery = currentQuery;
  } else if (selectedQuery !== null) {
    currentOrSelectedQuery = selectedQuery;
  }

  // suggested queries (if searching) or selected query (if not searching)
  let suggestedQueriesOrSelectedQuery: string[] = [];
  if (suggestedQueries !== null) {
    suggestedQueriesOrSelectedQuery = suggestedQueries;
  } else if (selectedQuery !== null) {
    suggestedQueriesOrSelectedQuery = [selectedQuery];
  }

  // status message
  function getStatusMessage() {
    if (isSearchPending) {
      return "Searching...";
    }
    if (isSelectPending) {
      return "Selecting...";
    }
    if (!currentOrSelectedQuery) {
      return "Type to search";
    }
    if (suggestedQueriesOrSelectedQuery.length === 0) {
      return `No matches found for "${currentOrSelectedQuery}"`;
    }
    return null;
  }

  // empty message
  function getEmptyMessage() {
    if (
      !isSearchPending &&
      currentOrSelectedQuery &&
      suggestedQueriesOrSelectedQuery.length === 0
    ) {
      return "Try a different search term.";
    }
    return null;
  }

  // style adapted from https://base-ui.com/react/components/combobox#async-search-single example, with the following changes:
  // - set width to w-full
  return (
    <ComboboxPrimitive.Root
      filter={null}
      value={selectedQuery}
      inputValue={currentOrSelectedQuery}
      items={suggestedQueriesOrSelectedQuery}
      onOpenChange={(open) => {
        if (open) {
          setCurrentQuery("");
          updateSuggestedQueries("");
        } else {
          setCurrentQuery(null);
          setSuggestedQueries(null);
        }
      }}
      onInputValueChange={(currentQuery) => {
        setCurrentQuery(currentQuery);
        updateSuggestedQueries(currentQuery);
      }}
      onValueChange={handleSelectedQueryChanged}
    >
      <div className="relative text-sm font-medium text-gray-900 w-full dark:text-gray-100 [&>input]:pr-8 has-[.combobox-clear]:[&>input]:pr-[calc(0.5rem+1.5rem*2)]">
        <ComboboxPrimitive.Input
          disabled={isSelectPending}
          className="flex w-full h-10 min-w-40 items-center justify-between gap-3 rounded-md border border-input pr-3 pl-3.5 bg-[canvas] select-none hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 data-popup-open:bg-gray-100 dark:bg-input/30 text-foreground"
        />
        <div className="absolute bottom-0 right-2 flex h-10 items-center justify-center text-gray-600 dark:text-gray-300">
          <ComboboxPrimitive.Clear
            disabled={isSelectPending}
            className="combobox-clear flex h-10 w-6 items-center justify-center rounded border-0 bg-transparent p-0"
            aria-label="Clear selection"
          >
            <XIcon className="size-4" />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger
            disabled={isSelectPending}
            className="flex h-10 w-6 items-center justify-center rounded border-0 bg-transparent p-0"
            aria-label="Open popup"
          >
            <ChevronDownIcon className="size-4" />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          className="outline-none isolate z-50"
          sideOffset={4}
        >
          <ComboboxPrimitive.Popup
            className="box-border w-(--anchor-width) max-h-[min(var(--available-height),23rem)] max-w-(--available-width) origin-(--transform-origin) overflow-y-auto scroll-pb-2 scroll-pt-2 overscroll-contain rounded-md bg-[canvas] py-2 text-foreground shadow-[0_10px_15px_-3px_var(--color-gray-200),0_4px_6px_-4px_var(--color-gray-200)] outline-1 outline-gray-200 transition-[transform,scale,opacity] data-ending-style:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 dark:bg-input/30 dark:-outline-offset-1 dark:shadow-none dark:outline-gray-300"
            aria-busy={isSearchPending || isSelectPending || undefined}
          >
            <ComboboxPrimitive.Status className="flex items-center gap-2 py-1 pl-4 pr-5 text-sm text-gray-600 dark:text-gray-300 empty:hidden">
              {getStatusMessage()}
            </ComboboxPrimitive.Status>
            <ComboboxPrimitive.Empty className="px-4 py-2 text-[0.875rem] leading-4 text-gray-600 dark:text-gray-300 empty:hidden">
              {getEmptyMessage()}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {suggestedQueries?.map((suggestedQuery, index) => (
                <ComboboxPrimitive.Item
                  key={index}
                  value={suggestedQuery}
                  disabled={isSelectPending}
                  className="grid cursor-default select-none grid-cols-[0.75rem_1fr] items-start gap-2 py-2 pl-4 pr-5 text-base leading-[1.2rem] outline-none [@media(hover:hover)]:data-highlighted:relative [@media(hover:hover)]:data-highlighted:z-0 [@media(hover:hover)]:data-highlighted:text-gray-900 [@media(hover:hover)]:data-highlighted:before:absolute [@media(hover:hover)]:data-highlighted:before:inset-y-0 [@media(hover:hover)]:data-highlighted:before:inset-x-2 [@media(hover:hover)]:data-highlighted:before:z-[-1] [@media(hover:hover)]:data-highlighted:before:rounded [@media(hover:hover)]:data-highlighted:before:bg-gray-100 [@media(hover:hover)]:data-highlighted:before:content-[''] dark:[@media(hover:hover)]:data-highlighted:text-gray-100 dark:[@media(hover:hover)]:data-highlighted:before:bg-gray-800"
                >
                  <ComboboxPrimitive.ItemIndicator className="col-start-1 mt-1">
                    <CheckIcon className="size-3" />
                  </ComboboxPrimitive.ItemIndicator>
                  <div className="col-start-2 text-[0.8125rem] text-gray-600 dark:text-gray-300">
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
