import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Trash2Icon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { type Table, createTable } from "@tissuumaps/core";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "@/components/common/accordion";
import { Button } from "@/components/ui/button";
import { AddDataObjectDialog } from "@/components/widgets/AddDataObjectDialog";
import { DataSourceWidget } from "@/components/widgets/DataSourceWidget";
import { useFocusObject } from "@/hooks/useFocusObject";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";
import { useProjectStore } from "@/stores/project";

import { TableSettingsWidget } from "./TableSettingsWidget";

export type TablesPanelProps = {
  className?: string;
};

export function TablesPanel({ className }: TablesPanelProps) {
  const tableDataProviders = useAppStore((state) => state.tableDataProviders);

  const tables = useProjectStore((state) => state.tables);
  const addTable = useProjectStore((state) => state.addTable);
  const moveTable = useProjectStore((state) => state.moveTable);

  // Controlled accordion so notifications can expand a specific table.
  const [openIds, setOpenIds] = useState<string[]>([]);
  useFocusObject("table", (id) =>
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
  );

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, canceled } = event.operation;
          if (isSortable(source) && !canceled) {
            // dnd-kit optimistically updates the DOM
            // https://github.com/clauderic/dnd-kit/issues/1564
            moveTable(source.id as string, source.index);
          }
        }}
      >
        <Accordion
          multiple
          value={openIds}
          onValueChange={setOpenIds}
          className="gap-y-2"
        >
          {tables.map((table, index) => (
            <TableAccordionItem key={table.id} table={table} index={index} />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataObjectDialog
        title="Add table"
        dataProviders={tableDataProviders}
        onAdd={(name, _layerId, dataSource) => {
          const table = createTable({
            id: crypto.randomUUID(),
            name,
            dataSource,
          });
          addTable(table);
        }}
      />
    </div>
  );
}

type TableAccordionItemProps = {
  table: Table;
  index: number;
};

function TableAccordionItem({ table, index }: TableAccordionItemProps) {
  const tableDataProviders = useAppStore((state) => state.tableDataProviders);

  const updateTable = useProjectStore((state) => state.updateTable);
  const deleteTable = useProjectStore((state) => state.deleteTable);

  const { ref, handleRef } = useSortable({ id: table.id, index });

  // Compose the sortable ref with our own so a notification click can scroll
  // this item into view.
  const itemElRef = useRef<HTMLDivElement | null>(null);
  const setItemRef = useCallback(
    (element: HTMLDivElement | null) => {
      itemElRef.current = element;
      ref(element);
    },
    [ref],
  );
  useFocusObject("table", (id) => {
    if (id === table.id) {
      itemElRef.current?.scrollIntoView({ block: "nearest" });
    }
  });

  return (
    <div ref={setItemRef}>
      <AccordionItem
        value={table.id}
        className="border rounded-md bg-sidebar p-2"
      >
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {table.name}
            </AccordionTrigger>
          </div>
          <div className="ml-auto flex flex-row items-center gap-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  // TODO replace by dialog overlay
                  window.confirm("Are you sure you want to delete this table?")
                ) {
                  deleteTable(table.id);
                }
              }}
              title="Delete table"
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          <DataSourceWidget
            dataSource={table.dataSource}
            dataProviders={tableDataProviders}
            onDataSourceChange={(newDataSource) => {
              updateTable(table.id, { dataSource: newDataSource });
            }}
            className="bg-card"
          />
          <TableSettingsWidget table={table} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
