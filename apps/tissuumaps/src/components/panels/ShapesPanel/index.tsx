import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import { type Shapes } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "../../common/accordion";
import { ShapesPanelItem } from "./ShapesPanelItem";

export function ShapesPanel({ className }: { className?: string }) {
  const shapes = useTissUUmaps((state) => state.shapes);
  const moveShapes = useTissUUmaps((state) => state.moveShapes);
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, canceled } = event.operation;
        if (isSortable(source) && !canceled) {
          // dnd-kit optimistically updates the DOM
          // https://github.com/clauderic/dnd-kit/issues/1564
          moveShapes(source.id as string, source.index);
        }
      }}
    >
      <Accordion className={className} multiple>
        {shapes.map((currentShapes, index) => (
          <ShapesAccordionItem
            key={currentShapes.id}
            shapes={currentShapes}
            index={index}
          />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

function ShapesAccordionItem({
  shapes,
  index,
}: {
  shapes: Shapes;
  index: number;
}) {
  const { ref, handleRef } = useSortable({ id: shapes.id, index });
  return (
    <div ref={ref}>
      <AccordionItem>
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <AccordionTrigger>{shapes.name}</AccordionTrigger>
          <AccordionTriggerUpDownIcon className="ml-auto" />
        </AccordionHeader>
        <AccordionPanel>
          <ShapesPanelItem shapes={shapes} />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
