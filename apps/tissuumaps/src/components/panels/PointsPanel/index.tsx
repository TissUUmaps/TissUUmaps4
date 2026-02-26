import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

import { type Points } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "../../common/accordion";
import { useConfirm } from "../../common/alert-dialog-provider";
import { PointsGroupsPanel } from "./PointsGroupsPanel";
import { PointsLayersPanel } from "./PointsLayersPanel";
import { PointsSettingsPanel } from "./PointsSettingsPanel";
import { PointsSourcePanel } from "./PointsSourcePanel";

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
  const updatePoints = useTissUUmaps((state) => state.updatePoints);
  const deletePoints = useTissUUmaps((state) => state.deletePoints);
  const confirm = useConfirm();

  const { ref, handleRef } = useSortable({ id: points.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <AccordionTrigger>{points.name}</AccordionTrigger>
          <div className="ml-auto flex flex-row items-center gap-x-2">
            <InputGroup className="w-24">
              <InputGroupAddon>PSF</InputGroupAddon>
              <InputGroupInput
                type="number"
                min={0}
                value={points.pointSizeFactor}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (Number.isFinite(value)) {
                    updatePoints(points.id, { pointSizeFactor: value });
                  }
                }}
              />
            </InputGroup>
            <InputGroup className="w-24">
              <InputGroupAddon>OPA</InputGroupAddon>
              <InputGroupInput
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={points.opacity}
                onChange={(event) => {
                  const opacity = event.target.valueAsNumber;
                  if (Number.isFinite(opacity)) {
                    updatePoints(points.id, {
                      opacity: Math.min(Math.max(0, opacity), 1),
                    });
                  }
                }}
              />
            </InputGroup>
            <Button
              variant="ghost"
              onClick={() =>
                updatePoints(points.id, { visibility: !points.visibility })
              }
            >
              {points.visibility ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void confirm({
                  title: "Delete point cloud",
                  body: "Are you sure you want to delete this point cloud? This action cannot be undone.",
                  cancelButton: "No",
                  actionButton: "Yes",
                }).then((confirmAnswer) => {
                  if (confirmAnswer) {
                    deletePoints(points.id);
                  }
                });
              }}
              title="Delete point cloud"
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          <PointsSourcePanel points={points} className="bg-card" />
          <PointsSettingsPanel points={points} className="bg-card" />
          <PointsLayersPanel points={points} className="bg-card" />
          <PointsGroupsPanel points={points} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
