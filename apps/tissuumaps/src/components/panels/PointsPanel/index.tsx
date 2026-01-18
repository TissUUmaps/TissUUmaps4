import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import type { Points } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "../../common/accordion";
import { PointsPanelItem } from "./PointsPanelItem";

export function PointsPanel({ className }: { className?: string }) {
  const points = useTissUUmaps((state) => state.points);
  const movePoints = useTissUUmaps((state) => state.movePoints);
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, canceled } = event.operation;
        if (isSortable(source) && !canceled) {
          // dnd-kit optimistically updates the DOM
          // https://github.com/clauderic/dnd-kit/issues/1564
          movePoints(source.id as string, source.index);
        }
      }}
    >
      <Accordion className={className} multiple>
        {points.map((currentPoints, index) => (
          <PointsAccordionItem
            key={currentPoints.id}
            points={currentPoints}
            index={index}
          />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

function PointsAccordionItem({
  points,
  index,
}: {
  points: Points;
  index: number;
}) {
  const { ref, handleRef } = useSortable({ id: points.id, index });
  return (
    <div ref={ref}>
      <AccordionItem>
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <AccordionTrigger>{points.name}</AccordionTrigger>
          <AccordionTriggerUpDownIcon className="ml-auto" />
        </AccordionHeader>
        <AccordionPanel>
          <PointsPanelItem points={points} />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
