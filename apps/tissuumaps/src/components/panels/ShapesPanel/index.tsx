import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

import { MathUtils, type Shapes } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

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

export type ShapesPanelProps = {
  className?: string;
};

export function ShapesPanel({ className }: ShapesPanelProps) {
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

type ShapesAccordionItemProps = {
  shapes: Shapes;
  index: number;
};

function ShapesAccordionItem({ shapes, index }: ShapesAccordionItemProps) {
  const updateShapes = useTissUUmaps((state) => state.updateShapes);
  const deleteShapes = useTissUUmaps((state) => state.deleteShapes);

  const { ref, handleRef } = useSortable({ id: shapes.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {shapes.name}
            </AccordionTrigger>
          </div>
          <div className="ml-auto flex flex-row items-center gap-x-2">
            <InputGroup className="w-24">
              <InputGroupAddon>OPA</InputGroupAddon>
              <InputGroupInput
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                max={1}
                value={shapes.opacity}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    updateShapes(shapes.id, {
                      opacity: MathUtils.clamp(
                        parseFloat(event.target.value),
                        0,
                        1,
                      ),
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
              title="Delete shape cloud"
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
