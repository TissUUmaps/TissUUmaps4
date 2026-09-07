import { Autocomplete } from "@base-ui/react/autocomplete";
import { ChevronDownIcon, FolderIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { useTableColumnQueries } from "./hooks";

export type TableColumnInputProps = {
  tableId: string | null;
  value: string | null;
  onValueChange: (column: string | null) => void;
  className?: string;
};

/** Maximum number of suggestions shown in the popup, which is not virtualized */
const maxSuggestions = 100;

function isGroupQuery(query: string): boolean {
  return query.endsWith("/");
}

export function TableColumnInput({
  tableId,
  value,
  onValueChange,
  className,
}: TableColumnInputProps) {
  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnQueries(tableId);

  const [text, setText] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);

  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value ?? "");
    setInvalid(false);
  }

  const [isSuggestPending, startSuggestTransition] = useTransition();
  useEffect(() => {
    if (!open) {
      return;
    }
    const abortController = new AbortController();
    startSuggestTransition(async () => {
      try {
        const newSuggestions = await suggestTableColumnQueries(text, {
          signal: abortController.signal,
        });
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
  }, [open, text, suggestTableColumnQueries, startSuggestTransition]);

  const [isCommitPending, startCommitTransition] = useTransition();
  const commitAbortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => commitAbortControllerRef.current?.abort(), []);
  function commit(query: string) {
    commitAbortControllerRef.current?.abort();
    if (query === (value ?? "")) {
      setInvalid(false);
      return;
    }
    if (query.trim() === "") {
      setText("");
      setInvalid(false);
      onValueChange(null);
      return;
    }
    const abortController = new AbortController();
    commitAbortControllerRef.current = abortController;
    startCommitTransition(async () => {
      try {
        const column = await resolveTableColumnQuery(query, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          startCommitTransition(() => {
            if (column !== null) {
              setText(column);
              setInvalid(false);
              onValueChange(column);
            } else {
              setInvalid(true);
            }
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to resolve column query", error);
        }
      }
    });
  }

  const highlightedSuggestionRef = useRef<string | undefined>(undefined);
  // base-ui closes the popup after any item press and only resets the
  // highlighted index on unmount, so cancelling the close would leave a stale
  // highlight on the group's children; a pressed group reopens the popup instead
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
    commitAbortControllerRef.current?.abort();
    setText(newText);
    setInvalid(false);
    if (details.reason === "item-press") {
      if (isGroupQuery(newText)) {
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
      return `No matches for "${text}"`;
    }
    if (suggestions.length > maxSuggestions) {
      return `Showing ${maxSuggestions} of ${suggestions.length} matches, keep typing to narrow down`;
    }
    return null;
  }

  return (
    <Autocomplete.Root
      value={text}
      onValueChange={handleTextChange}
      mode="none"
      items={shownSuggestions ?? []}
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
          aria-busy={isCommitPending || undefined}
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
                  key={suggestion}
                  value={suggestion}
                  className="flex cursor-default select-none items-center gap-2 px-3 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {isGroupQuery(suggestion) && (
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{suggestion}</span>
                </Autocomplete.Item>
              ))}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
