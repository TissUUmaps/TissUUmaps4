import type { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { FolderIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import type {
  TableColumnQuerySuggestion,
  TableColumnRef,
} from "@tissuumaps/core";

import {
  Autocomplete,
  AutocompleteClear,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteStatus,
  AutocompleteTrigger,
} from "@/components/common/autocomplete";
import { InputGroupAddon } from "@/components/ui/input-group";
import { useTableDataLoader } from "@/hooks/useDataLoader";
import { useProjectStore } from "@/stores/project";

import { formatTableColumnQuery, splitColumnQuery } from "./columnQuery";

export type TableColumnInputProps = {
  tableId: string | null;
  value: TableColumnRef | null;
  onValueChange: (value: TableColumnRef | null) => void;
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
  // right-to-left truncates long queries at the start; the inner span keeps
  // their characters in left-to-right order
  return (
    <span className="truncate [direction:rtl] text-left">
      {index === -1 ? (
        <span dir="ltr">{suggestion}</span>
      ) : (
        <span dir="ltr">
          {suggestion.slice(0, index)}
          <span className="font-semibold">
            {suggestion.slice(index, index + query.length)}
          </span>
          {suggestion.slice(index + query.length)}
        </span>
      )}
    </span>
  );
}

/**
 * Loads the data of the table queried by a column query on demand
 *
 * @param tableId - The ID of the table queried by unprefixed column queries
 * @returns A callback yielding the queried table and its data, or `null` if the
 * query does not identify a table of the current project, together with the
 * query's table prefix and the unprefixed column query
 */
function useLoadQueriedTableData(tableId: string | null) {
  const tables = useProjectStore((state) => state.tables);
  const loadTable = useTableDataLoader();
  return useCallback(
    async (query: string, options?: { signal?: AbortSignal }) => {
      const { table, tablePrefix, columnQuery } = splitColumnQuery(
        query,
        tableId,
        tables,
      );
      return {
        table,
        tableData: table !== null ? await loadTable(table, options) : null,
        tablePrefix,
        columnQuery,
      };
    },
    [tables, tableId, loadTable],
  );
}

export function TableColumnInput({
  tableId,
  value,
  onValueChange,
  className,
}: TableColumnInputProps) {
  const tables = useProjectStore((state) => state.tables);

  const loadQueriedTableData = useLoadQueriedTableData(tableId);

  const query = value !== null ? formatTableColumnQuery(value, tables) : "";

  const [text, setText] = useState(query);
  const [invalid, setInvalid] = useState(false);
  const [suggestions, setSuggestions] = useState<
    TableColumnQuerySuggestion[] | null
  >(null);
  const [open, setOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setText(query);
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
        const { tableData, tablePrefix, columnQuery } =
          await loadQueriedTableData(text, { signal: abortController.signal });
        const columnQueries =
          (await tableData?.suggestColumnQueries(columnQuery, {
            signal: abortController.signal,
          })) ?? [];
        const newSuggestions = columnQueries.map((suggestion) => ({
          ...suggestion,
          query: tablePrefix + suggestion.query,
        }));
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
  }, [open, text, loadQueriedTableData, startSuggestTransition]);

  const handleCommitResolved = useEffectEvent(
    (tableColumnRef: TableColumnRef | null) => {
      setPendingQuery(null);
      if (tableColumnRef !== null) {
        setText(formatTableColumnQuery(tableColumnRef, tables));
        setInvalid(false);
        onValueChange(tableColumnRef);
      } else {
        setInvalid(true);
      }
    },
  );
  useEffect(() => {
    if (pendingQuery === null) {
      return;
    }
    const abortController = new AbortController();
    const { signal } = abortController;
    loadQueriedTableData(pendingQuery, { signal })
      .then(async ({ table, tableData, tablePrefix, columnQuery }) => {
        const column =
          (await tableData?.resolveColumnQuery(columnQuery, { signal })) ??
          null;
        if (!signal.aborted) {
          handleCommitResolved(
            column !== null
              ? { table: tablePrefix !== "" ? table?.id : undefined, column }
              : null,
          );
        }
      })
      .catch((error) => {
        if (!signal.aborted) {
          console.error("Failed to resolve column query", error);
          setPendingQuery(null);
        }
      });
    return () => abortController.abort();
  }, [pendingQuery, loadQueriedTableData]);

  function commit(newQuery: string) {
    if (newQuery === query) {
      setPendingQuery(null);
      setInvalid(false);
      return;
    }
    if (newQuery.trim() === "") {
      setPendingQuery(null);
      setText("");
      setInvalid(false);
      onValueChange(null);
      return;
    }
    setPendingQuery(newQuery);
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
    details: AutocompletePrimitive.Root.ChangeEventDetails,
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
    <Autocomplete
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
      <AutocompleteInputGroup className={className}>
        <AutocompleteInput
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
        <InputGroupAddon align="inline-end">
          <AutocompleteClear />
          <AutocompleteTrigger aria-label="Show columns" title="Show columns" />
        </InputGroupAddon>
      </AutocompleteInputGroup>
      <AutocompletePopup>
        <AutocompleteStatus>{getStatusMessage()}</AutocompleteStatus>
        <AutocompleteList>
          {shownSuggestions?.map((suggestion) => (
            <AutocompleteItem key={suggestion.query} value={suggestion}>
              {suggestion.group && (
                <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <SuggestionText suggestion={suggestion.query} query={text} />
            </AutocompleteItem>
          ))}
        </AutocompleteList>
      </AutocompletePopup>
    </Autocomplete>
  );
}
