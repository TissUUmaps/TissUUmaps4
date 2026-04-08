import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  MathUtils,
  type Points,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

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
import { ItemsDataWidget } from "@/components/widgets/ItemsDataWidget";
import { useTissUUmaps } from "@/store";

import { PointsSettingsWidget } from "./PointsSettingsWidget";
import { PointsSettingsCategory } from "./types";

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
  const [activeSettingsCategory, setActiveSettingsCategory] =
    useState<PointsSettingsCategory | null>(null);
  const [selectedDataTable, setSelectedDataTable] = useState<string | null>(
    null,
  );
  const [selectedDataGroupByColumn, setSelectedDataGroupByColumn] = useState<
    string | null
  >(null);

  const { ref, handleRef } = useSortable({ id: points.id, index });

  const loadedPoints = useTissUUmaps((state) => state.loadedPoints);
  const loadedPointsData = useTissUUmaps((state) => state.loadedPointsData);
  const pointsDataProviders = useTissUUmaps(
    (state) => state.pointsDataProviders,
  );
  const updatePoints = useTissUUmaps((state) => state.updatePoints);
  const deletePoints = useTissUUmaps((state) => state.deletePoints);
  const loadPoints = useTissUUmaps((state) => state.loadPoints);

  const data = useMemo(() => {
    const loadedDataKey = loadedPoints.get(points.id);
    if (loadedDataKey !== undefined) {
      const loadedData = loadedPointsData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    return null;
  }, [points.id, loadedPoints, loadedPointsData]);

  const {
    table: memoizedDataTable,
    column: memoizedDataGroupByColumn,
    selectionDisabled: dataSelectionDisabled,
  } = useMemo(() => {
    if (
      activeSettingsCategory === PointsSettingsCategory.pointMarker &&
      getActiveConfigSource(points.pointMarker) === "groupBy" &&
      isGroupByConfig(points.pointMarker)
    ) {
      return { ...points.pointMarker.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointSize &&
      getActiveConfigSource(points.pointSize) === "groupBy" &&
      isGroupByConfig(points.pointSize)
    ) {
      return { ...points.pointSize.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointColor &&
      getActiveConfigSource(points.pointColor) === "groupBy" &&
      isGroupByConfig(points.pointColor)
    ) {
      return { ...points.pointColor.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointVisibility &&
      getActiveConfigSource(points.pointVisibility) === "groupBy" &&
      isGroupByConfig(points.pointVisibility)
    ) {
      return { ...points.pointVisibility.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointOpacity &&
      getActiveConfigSource(points.pointOpacity) === "groupBy" &&
      isGroupByConfig(points.pointOpacity)
    ) {
      return { ...points.pointOpacity.groupBy, selectionDisabled: true };
    }
    return {
      table: selectedDataTable,
      column: selectedDataGroupByColumn,
      selectionDisabled: false,
    };
  }, [
    activeSettingsCategory,
    points.pointMarker,
    points.pointSize,
    points.pointColor,
    points.pointVisibility,
    points.pointOpacity,
    selectedDataTable,
    selectedDataGroupByColumn,
  ]);

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
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updatePoints(points.id, {
                      pointSizeFactor: Math.max(0, newValue),
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
              // TODO signal, progress callback
              loadPoints(points.id, { newDataSource }).catch(console.error);
            }}
            className="bg-card"
          />
          {/* TODO layer configs */}
          <PointsSettingsWidget
            points={points}
            activeCategory={activeSettingsCategory}
            onActiveCategoryChange={setActiveSettingsCategory}
            className="bg-card"
          />
          {data !== null && (
            <ItemsDataWidget
              data={data}
              tableHeight={200}
              selectedTable={memoizedDataTable}
              onSelectedTableChange={setSelectedDataTable}
              selectedGroupByColumn={memoizedDataGroupByColumn}
              onSelectedGroupByColumnChange={setSelectedDataGroupByColumn}
              selectionDisabled={dataSelectionDisabled}
              className="bg-card"
            />
          )}
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
