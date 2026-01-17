import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import type { Points } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  PanelItemsAccordion,
  PanelItemsAccordionHeader,
  PanelItemsAccordionItem,
  PanelItemsAccordionPanel,
  PanelItemsAccordionTrigger,
  PanelItemsAccordionTriggerIcon,
} from "../../common/PanelItemsAccordion";
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
      <PanelItemsAccordion className={className} multiple>
        {points.map((currentPoints, index) => (
          <SortablePointsPanelItem
            key={currentPoints.id}
            points={currentPoints}
            index={index}
          />
        ))}
      </PanelItemsAccordion>
    </DragDropProvider>
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
      <PanelItemsAccordionItem>
        <PanelItemsAccordionHeader>
          <GripVertical ref={handleRef} />
          <PanelItemsAccordionTrigger>{points.name}</PanelItemsAccordionTrigger>
          <PanelItemsAccordionTriggerIcon className="ml-auto" />
        </PanelItemsAccordionHeader>
        <PanelItemsAccordionPanel>
          <PointsPanelItem points={points} />
        </PanelItemsAccordionPanel>
      </PanelItemsAccordionItem>
    </div>
  );
}
