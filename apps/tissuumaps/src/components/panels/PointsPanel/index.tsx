import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import type { HTMLProps } from "react";

import type { Points } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { PointsPanelItem } from "./PointsPanelItem";

export function PointsPanel(props: HTMLProps<HTMLDivElement>) {
  const points = useTissUUmaps((state) => state.points);
  const movePoints = useTissUUmaps((state) => state.movePoints);

  return (
    <div {...props}>
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
        <Accordion multiple>
          {points.map((currentPoints, index) => (
            <SortablePointsPanelItem
              key={currentPoints.id}
              points={currentPoints}
              index={index}
            />
          ))}
        </Accordion>
      </DragDropProvider>
    </div>
  );
}

function SortablePointsPanelItem({
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
        <AccordionTrigger>
          <GripVertical ref={handleRef} />
          {points.name}
        </AccordionTrigger>
        <AccordionContent>
          <PointsPanelItem points={points} />
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
