import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { MathUtils, type Points, createPoints } from "@tissuumaps/core";

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
import { AddDataObjectDialog } from "@/components/widgets/AddDataObjectDialog";
import { DataSourceWidget } from "@/components/widgets/DataSourceWidget";
import { ItemsDataWidget } from "@/components/widgets/ItemsDataWidget";
import { usePointsData } from "@/hooks/useData";
import { useFocusObject } from "@/hooks/useFocusObject";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";
import { useProjectStore } from "@/stores/project";

import { PointsSettingsWidget } from "./PointsSettingsWidget";
import { usePointsDataTableColumns } from "./usePointsDataTableColumns";
import { usePointsDataWidget } from "./usePointsDataWidget";

export type PointsPanelProps = {
  className?: string;
};

export function PointsPanel({ className }: PointsPanelProps) {
  const pointsDataProviders = useAppStore((state) => state.pointsDataProviders);

  const layers = useProjectStore((state) => state.layers);
  const points = useProjectStore((state) => state.points);
  const addPoints = useProjectStore((state) => state.addPoints);
  const movePoints = useProjectStore((state) => state.movePoints);

  // Controlled accordion so notifications can expand a specific point cloud.
  const [openIds, setOpenIds] = useState<string[]>([]);
  useFocusObject("points", (id) =>
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
  );

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
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
        <Accordion
          multiple
          value={openIds}
          onValueChange={setOpenIds}
          className="gap-y-2"
        >
          {points.map((currentPoints, index) => (
            <PointsAccordionItem
              key={currentPoints.id}
              points={currentPoints}
              index={index}
            />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataObjectDialog
        title="Add points"
        layers={layers}
        dataProviders={pointsDataProviders}
        onAdd={(name, layerId, dataSource) => {
          if (!layerId) return;
          const newPoints = createPoints({
            id: crypto.randomUUID(),
            name,
            dataSource,
            layer: layerId,
          });
          addPoints(newPoints);
        }}
      />
    </div>
  );
}

type PointsAccordionItemProps = {
  points: Points;
  index: number;
};

function PointsAccordionItem({ points, index }: PointsAccordionItemProps) {
  const {
    activeSettingsCategory,
    setActiveSettingsCategory,
    selectedTable,
    setSelectedTable,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  } = usePointsDataWidget(points);

  const pointsDataProviders = useAppStore((state) => state.pointsDataProviders);

  const updatePoints = useProjectStore((state) => state.updatePoints);
  const deletePoints = useProjectStore((state) => state.deletePoints);

  const pointsData = usePointsData(points.id);

  const { extraTableGroupColumnDefs } = usePointsDataTableColumns(
    points,
    selectedTable,
    selectedGroupByColumn,
  );

  const { ref, handleRef } = useSortable({ id: points.id, index });

  // Compose the sortable ref with our own so a notification click can scroll
  // this item into view.
  const itemElRef = useRef<HTMLDivElement | null>(null);
  const setItemRef = useCallback(
    (element: HTMLDivElement | null) => {
      itemElRef.current = element;
      ref(element);
    },
    [ref],
  );
  useFocusObject("points", (id) => {
    if (id === points.id) {
      itemElRef.current?.scrollIntoView({ block: "nearest" });
    }
  });

  return (
    <div ref={setItemRef}>
      <AccordionItem
        value={points.id}
        className="border rounded-md bg-sidebar p-2"
      >
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {points.name}
            </AccordionTrigger>
          </div>
          <div className="ml-auto flex flex-row items-center gap-x-2">
            <InputGroup className="w-20">
              <InputGroupAddon>s</InputGroupAddon>
              <InputGroupInput
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                value={points.pointSizeFactor}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updatePoints(points.id, {
                      pointSizeFactor: Math.max(0, newValue),
                    });
                  }
                }}
              />
            </InputGroup>
            <InputGroup className="w-20">
              <InputGroupAddon>&alpha;</InputGroupAddon>
              <InputGroupInput
                type="number"
                inputMode="decimal"
                step={0.05}
                min={0}
                max={1}
                value={points.opacity}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updatePoints(points.id, {
                      opacity: MathUtils.clamp(newValue, 0, 1),
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
                  // TODO replace by dialog overlay
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
              updatePoints(points.id, { dataSource: newDataSource });
            }}
            className="bg-card"
          />
          <PointsSettingsWidget
            points={points}
            activeCategory={activeSettingsCategory}
            onActiveCategoryChange={setActiveSettingsCategory}
            className="bg-card"
          />
          {pointsData !== null && (
            <ItemsDataWidget
              data={pointsData}
              tableHeight={200}
              selectedTable={selectedTable}
              onSelectedTableChange={setSelectedTable}
              selectedGroupByColumn={selectedGroupByColumn}
              onSelectedGroupByColumnChange={setSelectedGroupByColumn}
              extraTableGroupColumnDefs={extraTableGroupColumnDefs}
              className="bg-card"
            />
          )}
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
