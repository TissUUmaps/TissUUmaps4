import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

import { MathUtils, type Points } from "@tissuumaps/core";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpDownIcon,
} from "@/components/common/accordion";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { DataSourceWidget } from "@/components/widgets/DataSourceWidget";
import { useTissUUmaps } from "@/store";

import { PointsSettingsWidget } from "./PointsSettingsWidget";

export type PointsPanelProps = {
  className?: string;
};

export function PointsPanel({ className }: PointsPanelProps) {
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

type PointsAccordionItemProps = {
  points: Points;
  index: number;
};

function PointsAccordionItem({ points, index }: PointsAccordionItemProps) {
  const pointsDataProviders = useTissUUmaps(
    (state) => state.pointsDataProviders,
  );
  const updatePoints = useTissUUmaps((state) => state.updatePoints);
  const deletePoints = useTissUUmaps((state) => state.deletePoints);
  const loadPoints = useTissUUmaps((state) => state.loadPoints);

  const { ref, handleRef } = useSortable({ id: points.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {points.name}
            </AccordionTrigger>
          </div>
          <div className="ml-auto flex flex-row items-center gap-x-2">
            <InputGroup className="w-24">
              <InputGroupAddon>PSF</InputGroupAddon>
              <InputGroupInput
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                value={points.pointSizeFactor}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (!isNaN(value)) {
                    updatePoints(points.id, {
                      pointSizeFactor: Math.max(0, value),
                    });
                  }
                }}
              />
            </InputGroup>
            <InputGroup className="w-24">
              <InputGroupAddon>OPA</InputGroupAddon>
              <InputGroupInput
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                max={1}
                value={points.opacity}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (!isNaN(value)) {
                    updatePoints(points.id, {
                      opacity: MathUtils.clamp(value, 0, 1),
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
                if (
                  window.confirm(
                    "Are you sure you want to delete this point cloud?",
                  )
                ) {
                  deletePoints(points.id);
                }
              }}
              title="Delete point cloud"
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          <DataSourceWidget
            dataSource={points.dataSource}
            dataProviders={pointsDataProviders}
            onDataSourceChange={(newDataSource) => {
              // TODO signal, progress callback
              loadPoints(points.id, { newDataSource }).catch(console.error);
            }}
            className="bg-card"
          />
          <PointsSettingsWidget points={points} className="bg-card" />
          {/* TODO layer configs */}
          {/* TODO table */}
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
