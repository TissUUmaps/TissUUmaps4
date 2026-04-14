import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Trash2Icon } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { TableSettingsWidget } from "./TableSettingsWidget";

export type TablesPanelProps = {
  className?: string;
};

export function TablesPanel({ className }: TablesPanelProps) {
  const tables = useTissUUmaps((state) => state.tables);
  const tableDataProviders = useTissUUmaps((state) => state.tableDataProviders);
  const addTable = useTissUUmaps((state) => state.addTable);
  const moveTable = useTissUUmaps((state) => state.moveTable);

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
        <Accordion multiple className="gap-y-2">
          {tables.map((table, index) => (
            <TableAccordionItem key={table.id} table={table} index={index} />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataObjectDialog
        title="Add table"
        dataProviders={tableDataProviders}
        onAdd={(name, _type, dataSource) => {
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
  const tableDataProviders = useTissUUmaps((state) => state.tableDataProviders);
  const deleteTable = useTissUUmaps((state) => state.deleteTable);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const { ref, handleRef } = useSortable({ id: table.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
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
              // TODO signal, progress callback
              loadTable(table.id, { newDataSource }).catch(console.error);
            }}
            className="bg-card"
          />
          <TableSettingsWidget table={table} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
