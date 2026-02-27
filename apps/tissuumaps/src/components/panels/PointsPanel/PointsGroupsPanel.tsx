import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";
import { useCallback, useEffect, useMemo, useState } from "react";

import { type Points, isGroupByConfig } from "@tissuumaps/core";

import { Fieldset, FieldsetLegend } from "../../common/fieldset";
import { SimpleSelect } from "../../common/simple-select";

interface GroupByColumn {
  table: string;
  column: string;
}

function extractGroupByColumns(points: Points): GroupByColumn[] {
  const configs = [
    points.pointMarker,
    points.pointSize,
    points.pointColor,
    points.pointVisibility,
    points.pointOpacity,
  ];

  const groupBys = configs.filter(isGroupByConfig).map((config) => ({
    table: config.groupBy.table,
    column: config.groupBy.column,
  }));

  return groupBys.filter(
    (item, idx, arr) =>
      arr.findIndex(
        (x) => x.table === item.table && x.column === item.column,
      ) === idx,
  );
}

function groupByKey(g: GroupByColumn): string {
  return JSON.stringify([g.table, g.column]);
}

function groupByLabel(g: GroupByColumn): string {
  return `${g.table} — ${g.column}`;
}

export type PointsGroupsPanelProps = {
  points: Points;
  className?: string;
};

export function PointsGroupsPanel({
  points,
  className,
}: PointsGroupsPanelProps) {
  const [selected, setSelected] = useState<GroupByColumn | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const loadTable = useTissUUmaps((state) => state.loadTable);

  const groupByColumns = useMemo(() => extractGroupByColumns(points), [points]);

  const currentSelection = useMemo(() => {
    if (groupByColumns.length === 0) return null;

    // Check if current selection is still valid
    const found = groupByColumns.find(
      (g) => g.table === selected?.table && g.column === selected?.column,
    );

    return found ?? groupByColumns[0];
  }, [groupByColumns, selected]);

  // Load data and extract categories
  useEffect(() => {
    if (!currentSelection) {
      return;
    }

    const { table: tableId, column } = currentSelection;
    const abortController = new AbortController();
    let isCancelled = false;

    async function loadDataAndExtractCategories() {
      try {
        const tableData = await loadTable(tableId, {
          signal: abortController.signal,
        });

        if (isCancelled) return;

        const columnData = await tableData.loadColumn<string | number>(column, {
          signal: abortController.signal,
        });

        if (isCancelled) return;

        if (columnData) {
          const uniqueValues = [...new Set(Array.from(columnData))].map(String);
          setCategories(uniqueValues);
        } else {
          setCategories([]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load data:", error);
          setCategories([]);
        }
      }
    }

    loadDataAndExtractCategories().catch(console.error);

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [currentSelection, loadTable]);

  const handleSelectionChange = useCallback(
    (key: string | null) => {
      if (key === null) {
        setSelected(null);
        setCategories([]);
        return;
      }

      const found = groupByColumns.find((g) => groupByKey(g) === key);
      setSelected(found ?? null);
      setCategories([]);
    },
    [groupByColumns],
  );

  if (groupByColumns.length === 0) {
    return null;
  }

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Groups
      </FieldsetLegend>

      <SimpleSelect
        items={groupByColumns}
        itemLabel={groupByLabel}
        itemValue={groupByKey}
        value={currentSelection ? groupByKey(currentSelection) : null}
        onValueChange={handleSelectionChange}
      />

      {currentSelection && categories.length > 0 && (
        <table className="mt-2 w-full text-xs border">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat}>
                <td className="border px-2 py-1">{cat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Fieldset>
  );
}
