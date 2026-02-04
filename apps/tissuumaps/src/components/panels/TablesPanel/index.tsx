import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "../../common/accordion";
import { TablesPanelItem } from "./TablesPanelItem";

export function TablesPanel({ className }: { className?: string }) {
  const tables = useTissUUmaps((state) => state.tables);
  return (
    <Accordion className={className} multiple>
      {tables.map((table) => (
        <AccordionItem key={table.id}>
          <AccordionHeader>
            <AccordionTrigger>{table.name}</AccordionTrigger>
            <AccordionTriggerUpDownIcon className="ml-auto" />
          </AccordionHeader>
          <AccordionPanel>
            <TablesPanelItem table={table} />
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
