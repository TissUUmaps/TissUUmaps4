import { Autocomplete } from "@base-ui/react/autocomplete";
import { ChevronDownIcon, FolderIcon, XIcon } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import type { TableColumnQuerySuggestion } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";
import { useLazyTableData } from "@/hooks/useLazyData";
import { cn } from "@/lib/utils";

export type TableColumnInputProps = {
  tableId: string | null;
  value: string | null;
  onValueChange: (column: string | null) => void;
  className?: string;
};

const maxSuggestions = 100;

function findQuery(suggestion: string, query: string): number {
  return suggestion.toLowerCase().indexOf(query.toLowerCase());
}

type SuggestionTextProps = {
  suggestion: string;
  query: string;
};

function SuggestionText({ suggestion, query }: SuggestionTextProps) {
  const index = query !== "" ? findQuery(suggestion, query) : -1;
  if (index === -1) {
    return <span className="truncate">{suggestion}</span>;
  }
  return (
    <span className="truncate">
      {suggestion.slice(0, index)}
      <span className="font-semibold">
        {suggestion.slice(index, index + query.length)}
      </span>
      {suggestion.slice(index + query.length)}
    </span>
  );
}

export function TableColumnInput({
  tableId,
  value,
  onValueChange,
  className,
}: TableColumnInputProps) {
  const loadTableData = useLazyTableData(tableId);

  const [text, setText] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  const [suggestions, setSuggestions] = useState<
    TableColumnQuerySuggestion[] | null
  >(null);
  const [open, setOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value ?? "");
    setInvalid(false);
    setPendingQuery(null);
  }

  const [isSuggestPending, startSuggestTransition] = useTransition();
  useEffect(() => {
    if (!open) {
      return;
    }
    const abortController = new AbortController();
    startSuggestTransition(async () => {
      try {
        const tableData = await loadTableData({
          signal: abortController.signal,
        });
        const newSuggestions =
          (await tableData?.suggestColumnQueries(text, {
            signal: abortController.signal,
          })) ?? [];
        if (!abortController.signal.aborted) {
          startSuggestTransition(() => setSuggestions(newSuggestions));
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to suggest column queries", error);
        }
      }
    });
    return () => abortController.abort();
  }, [open, text, loadTableData, startSuggestTransition]);

  const handleCommitResolved = useEffectEvent((column: string | null) => {
    setPendingQuery(null);
    if (column !== null) {
      setText(column);
      setInvalid(false);
      onValueChange(column);
    } else {
      setInvalid(true);
    }
  });
  useEffect(() => {
    if (pendingQuery === null) {
      return;
    }
    const abortController = new AbortController();
    const { signal } = abortController;
    loadTableData({ signal })
      .then(
        (tableData) =>
          tableData?.resolveColumnQuery(pendingQuery, { signal }) ?? null,
      )
      .then((column) => {
        if (!signal.aborted) {
          handleCommitResolved(column);
        }
      })
      .catch((error) => {
        if (!signal.aborted) {
          console.error("Failed to resolve column query", error);
          setPendingQuery(null);
        }
      });
    return () => abortController.abort();
  }, [pendingQuery, loadTableData]);

  function commit(query: string) {
    if (query === (value ?? "")) {
      setPendingQuery(null);
      setInvalid(false);
      return;
    }
    if (query.trim() === "") {
      setPendingQuery(null);
      setText("");
      setInvalid(false);
      onValueChange(null);
      return;
    }
    setPendingQuery(query);
  }

  const highlightedSuggestionRef = useRef<
    TableColumnQuerySuggestion | undefined
  >(undefined);
  // base-ui closes the popup after any item press and only resets the
  // highlighted index on unmount, so cancelling the close would leave a stale
  // highlight on the children; a pressed group suggestion reopens the
  // popup instead
  const reopenRef = useRef(false);

  function handleTextChange(
    newText: string,
    details: Autocomplete.Root.ChangeEventDetails,
  ) {
    // base-ui clears the input on Escape when the popup is closed
    if (details.reason === "escape-key") {
      details.cancel();
      return;
    }
    setPendingQuery(null);
    setText(newText);
    setInvalid(false);
    if (details.reason === "item-press") {
      const pressed = suggestions?.find((s) => s.query === newText);
      if (pressed?.group) {
        reopenRef.current = true;
      } else {
        commit(newText);
      }
      return;
    }
    if (details.reason === "clear-press") {
      onValueChange(null);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setSuggestions(null);
      highlightedSuggestionRef.current = undefined;
    }
  }

  function handleOpenChangeComplete(newOpen: boolean) {
    if (!newOpen && reopenRef.current) {
      reopenRef.current = false;
      setOpen(true);
    }
  }

  const shownSuggestions = suggestions?.slice(0, maxSuggestions);

  function getStatusMessage(): string | null {
    if (suggestions === null) {
      return isSuggestPending ? "Loading table..." : null;
    }
    if (suggestions.length === 0) {
      return text === "" ? "No columns" : `No matches for "${text}"`;
    }
    // matching suggestions are listed first, so the first one decides
    if (findQuery(suggestions[0]!.query, text) === -1) {
      return suggestions.length > maxSuggestions
        ? `No matches for "${text}", showing the first ${maxSuggestions} columns`
        : `No matches for "${text}", showing all columns`;
    }
    if (suggestions.length > maxSuggestions) {
      return `Showing the first ${maxSuggestions} suggestions, keep typing to narrow down`;
    }
    return null;
  }

  return (
    <Autocomplete.Root
      value={text}
      onValueChange={handleTextChange}
      mode="none"
      items={shownSuggestions ?? []}
      itemToStringValue={(suggestion) => suggestion.query}
      openOnInputClick
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
      onItemHighlighted={(suggestion) => {
        highlightedSuggestionRef.current = suggestion;
      }}
    >
      <div className={cn("relative w-full", className)}>
        <Autocomplete.Input
          render={<Input />}
          className="pr-14"
          aria-invalid={invalid || undefined}
          aria-busy={pendingQuery !== null || undefined}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              highlightedSuggestionRef.current === undefined
            ) {
              commit(text);
            }
          }}
          onBlur={() => commit(text)}
        />
        <div className="absolute inset-y-0 right-1 flex items-center text-muted-foreground">
          <Autocomplete.Clear
            title="Clear"
            className="flex size-6 items-center justify-center rounded hover:text-foreground"
          >
            <XIcon className="size-4" />
          </Autocomplete.Clear>
          <Autocomplete.Trigger
            title="Show columns"
            className="flex size-6 items-center justify-center rounded hover:text-foreground"
          >
            <ChevronDownIcon className="size-4" />
          </Autocomplete.Trigger>
        </div>
      </div>
      <Autocomplete.Portal>
        <Autocomplete.Positioner
          className="isolate z-50 outline-none"
          sideOffset={4}
        >
          <Autocomplete.Popup className="box-border w-(--anchor-width) max-h-[min(var(--available-height),23rem)] max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-md border bg-popover py-1 text-popover-foreground shadow-md transition-[transform,scale,opacity] data-ending-style:transition-none data-starting-style:scale-95 data-starting-style:opacity-0">
            <Autocomplete.Status className="px-3 py-1.5 text-xs text-muted-foreground empty:hidden">
              {getStatusMessage()}
            </Autocomplete.Status>
            <Autocomplete.List>
              {shownSuggestions?.map((suggestion) => (
                <Autocomplete.Item
                  key={suggestion.query}
                  value={suggestion}
                  className="flex cursor-default select-none items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {suggestion.group && (
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <SuggestionText suggestion={suggestion.query} query={text} />
                </Autocomplete.Item>
              ))}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
