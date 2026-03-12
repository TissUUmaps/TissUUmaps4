import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import { type Labels } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "../../common/accordion";
import { LabelsPanelItem } from "./LabelsPanelItem";

export type LabelsPanelProps = {
  className?: string;
};

export function LabelsPanel({ className }: LabelsPanelProps) {
  const labels = useTissUUmaps((state) => state.labels);
  const moveLabels = useTissUUmaps((state) => state.moveLabels);

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, canceled } = event.operation;
        if (isSortable(source) && !canceled) {
          // dnd-kit optimistically updates the DOM
          // https://github.com/clauderic/dnd-kit/issues/1564
          moveLabels(source.id as string, source.index);
        }
      }}
    >
      <Accordion className={className} multiple>
        {labels.map((currentLabels, index) => (
          <LabelsAccordionItem
            key={currentLabels.id}
            labels={currentLabels}
            index={index}
          />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

type LabelsAccordionItemProps = {
  labels: Labels;
  index: number;
};

function LabelsAccordionItem({ labels, index }: LabelsAccordionItemProps) {
  const { ref, handleRef } = useSortable({ id: labels.id, index });

  return (
    <div ref={ref}>
      <AccordionItem>
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <AccordionTrigger>{labels.name}</AccordionTrigger>
          <AccordionTriggerUpDownIcon className="ml-auto" />
        </AccordionHeader>
        <AccordionPanel>
          <LabelsPanelItem labels={labels} />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
