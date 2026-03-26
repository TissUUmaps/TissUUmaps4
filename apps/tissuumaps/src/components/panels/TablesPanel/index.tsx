import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Trash2Icon } from "lucide-react";

import { type Table } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "../../common/accordion";
import { TablesSettingsPanel } from "./TablesSettingsPanel";
import { TablesSourcePanel } from "./TablesSourcePanel";

export type TablesPanelProps = {
  className?: string;
};

export function TablesPanel({ className }: TablesPanelProps) {
  const tables = useTissUUmaps((state) => state.tables);
  const moveTable = useTissUUmaps((state) => state.moveTable);

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, canceled } = event.operation;
        if (isSortable(source) && !canceled) {
          moveTable(source.id as string, source.index);
        }
      }}
    >
      <Accordion className={className} multiple>
        {tables.map((table, index) => (
          <TableAccordionItem key={table.id} table={table} index={index} />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

type TableAccordionItemProps = {
  table: Table;
  index: number;
};

function TableAccordionItem({ table, index }: TableAccordionItemProps) {
  const deleteTable = useTissUUmaps((state) => state.deleteTable);

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
          <TablesSourcePanel table={table} className="bg-card" />
          <TablesSettingsPanel table={table} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
