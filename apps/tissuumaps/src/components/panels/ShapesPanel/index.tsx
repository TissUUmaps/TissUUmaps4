import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

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
import { ShapesGroupsPanel } from "./ShapesGroupsPanel";
import { ShapesLayersPanel } from "./ShapesLayersPanel";
import { ShapesSettingsPanel } from "./ShapesSettingsPanel";
import { ShapesSourcePanel } from "./ShapesSourcePanel";

export function ShapesPanel({ className }: { className?: string }) {
  const shapes = useTissUUmaps((state) => state.shapes);
  const moveShapes = useTissUUmaps((state) => state.moveShapes);
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, canceled } = event.operation;
        if (isSortable(source) && !canceled) {
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
  const updateShapes = useTissUUmaps((state) => state.updateShapes);
  const deleteShapes = useTissUUmaps((state) => state.deleteShapes);

  const { ref, handleRef } = useSortable({ id: shapes.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <AccordionTrigger>{shapes.name}</AccordionTrigger>
          <div className="ml-auto flex flex-row items-center gap-x-2">
            <InputGroup className="w-24">
              <InputGroupAddon>OPA</InputGroupAddon>
              <InputGroupInput
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={shapes.opacity}
                onChange={(event) => {
                  const opacity = event.target.valueAsNumber;
                  if (Number.isFinite(opacity)) {
                    updateShapes(shapes.id, {
                      opacity: Math.min(Math.max(0, opacity), 1),
                    });
                  }
                }}
              />
            </InputGroup>
            <Button
              variant="ghost"
              onClick={() =>
                updateShapes(shapes.id, { visibility: !shapes.visibility })
              }
            >
              {shapes.visibility ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this shape cloud?",
                  )
                ) {
                  deleteShapes(shapes.id);
                }
              }}
              title="Delete shapes"
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          <ShapesSourcePanel shapes={shapes} className="bg-card" />
          <ShapesSettingsPanel shapes={shapes} className="bg-card" />
          <ShapesLayersPanel shapes={shapes} className="bg-card" />
          <ShapesGroupsPanel shapes={shapes} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
