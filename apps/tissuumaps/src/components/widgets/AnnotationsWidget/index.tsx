import { useMemo, useState } from "react";

import type { ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Input } from "@/components/ui/input";
import { TableColumnInput } from "@/components/widgets/TableColumnInput";
import { cn } from "@/lib/utils";

import {
  GroupAnnotationsTable,
  type GroupColumn,
  type GroupVisibility,
} from "./GroupAnnotationsTable";
import {
  ItemAnnotationsTable,
  type ItemAnnotationsTableColumnDef,
} from "./ItemAnnotationsTable";

// rows have a fixed height, so that the visible range follows from the scroll
// offset alone; cells of extra columns must fit within it
const tableRowHeight = 28;

/**
 * Keeps the groups whose name contains a filter, ignoring case
 *
 * @param groupCounts - The row count of every group
 * @param groupFilter - The text to look for, or `""` to keep every group
 * @returns The row count of every group that passes the filter
 */
function filterGroupCounts(
  groupCounts: Map<string, number>,
  groupFilter: string,
): Map<string, number> {
  const lowerCaseGroupFilter = groupFilter.toLowerCase();
  if (lowerCaseGroupFilter === "") {
    return groupCounts;
  }
  return new Map(
    Array.from(groupCounts).filter(([group]) =>
      group.toLowerCase().includes(lowerCaseGroupFilter),
    ),
  );
}

export type AnnotationsWidgetProps = {
  data?: ItemsData;
  tableHeight: number;
  tableId: string | null;
  selectedGroupByColumn: string | null;
  onSelectedGroupByColumnChange: (column: string | null) => void;
  groupCounts: Map<string, number> | null;
  groupVisibility?: GroupVisibility;
  extraItemColumnDefs?: ItemAnnotationsTableColumnDef[];
  groupColumns?: GroupColumn[];
  className?: string;
};

export function AnnotationsWidget({
  data,
  tableHeight,
  tableId,
  selectedGroupByColumn,
  onSelectedGroupByColumnChange,
  groupCounts,
  groupVisibility,
  extraItemColumnDefs,
  groupColumns,
  className,
}: AnnotationsWidgetProps) {
  const [groupFilter, setGroupFilter] = useState("");

  const filteredGroupCounts = useMemo(
    () =>
      groupCounts !== null ? filterGroupCounts(groupCounts, groupFilter) : null,
    [groupCounts, groupFilter],
  );

  const isGroupVisible = groupVisibility?.isVisible;

  // the shown items are those of the groups that pass the filter and are
  // visible
  const itemCounts = useMemo(() => {
    if (groupCounts === null || filteredGroupCounts === null) {
      return null;
    }
    let total = 0;
    for (const count of groupCounts.values()) {
      total += count;
    }
    let shown = 0;
    for (const [group, count] of filteredGroupCounts) {
      if (isGroupVisible === undefined || isGroupVisible(group)) {
        shown += count;
      }
    }
    return { shown, total };
  }, [groupCounts, filteredGroupCounts, isGroupVisible]);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Annotations
        {itemCounts !== null && (
          <span
            className="ml-1 text-xs font-normal text-muted-foreground"
            title="Items in the shown groups / items in the table"
          >
            ({itemCounts.shown.toLocaleString()} /{" "}
            {itemCounts.total.toLocaleString()})
          </span>
        )}
      </FieldsetLegend>
      <Field disabled={tableId === null}>
        <FieldLabel>Group by</FieldLabel>
        <TableColumnInput
          tableId={tableId}
          value={selectedGroupByColumn}
          onValueChange={onSelectedGroupByColumnChange}
        />
      </Field>
      <Field disabled={selectedGroupByColumn === null}>
        <FieldLabel>Filter groups</FieldLabel>
        <Input
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        />
      </Field>
      {tableId !== null && selectedGroupByColumn !== null ? (
        <GroupAnnotationsTable
          height={tableHeight}
          rowHeight={tableRowHeight}
          tableId={tableId}
          groupByColumn={selectedGroupByColumn}
          groupCounts={filteredGroupCounts}
          groupVisibility={groupVisibility}
          groupColumns={groupColumns}
        />
      ) : (
        <ItemAnnotationsTable
          data={data}
          height={tableHeight}
          rowHeight={tableRowHeight}
          tableId={tableId}
          extraColumnDefs={extraItemColumnDefs}
        />
      )}
    </Fieldset>
  );
}
