import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  MathUtils,
  type Shapes,
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

import { ShapesSettingsWidget } from "./ShapesSettingsWidget";
import { ShapesSettingsCategory } from "./types";

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
  const [activeSettingsCategory, setActiveSettingsCategory] =
    useState<ShapesSettingsCategory | null>(null);
  const [selectedDataTable, setSelectedDataTable] = useState<string | null>(
    null,
  );
  const [selectedDataGroupByColumn, setSelectedDataGroupByColumn] = useState<
    string | null
  >(null);

  const { ref, handleRef } = useSortable({ id: shapes.id, index });

  const loadedShapes = useTissUUmaps((state) => state.loadedShapes);
  const loadedShapesData = useTissUUmaps((state) => state.loadedShapesData);
  const shapesDataProviders = useTissUUmaps(
    (state) => state.shapesDataProviders,
  );
  const updateShapes = useTissUUmaps((state) => state.updateShapes);
  const deleteShapes = useTissUUmaps((state) => state.deleteShapes);
  const loadShapes = useTissUUmaps((state) => state.loadShapes);

  const data = useMemo(() => {
    const loadedDataKey = loadedShapes.get(shapes.id);
    if (loadedDataKey !== undefined) {
      const loadedData = loadedShapesData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    return null;
  }, [shapes.id, loadedShapes, loadedShapesData]);

  const {
    table: memoizedDataTable,
    column: memoizedDataGroupByColumn,
    selectionDisabled: dataSelectionDisabled,
  } = useMemo(() => {
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillColor &&
      getActiveConfigSource(shapes.shapeFillColor) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillColor)
    ) {
      return { ...shapes.shapeFillColor.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillVisibility &&
      getActiveConfigSource(shapes.shapeFillVisibility) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillVisibility)
    ) {
      return { ...shapes.shapeFillVisibility.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillOpacity &&
      getActiveConfigSource(shapes.shapeFillOpacity) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillOpacity)
    ) {
      return { ...shapes.shapeFillOpacity.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeColor &&
      getActiveConfigSource(shapes.shapeStrokeColor) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeColor)
    ) {
      return { ...shapes.shapeStrokeColor.groupBy, selectionDisabled: true };
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeVisibility &&
      getActiveConfigSource(shapes.shapeStrokeVisibility) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeVisibility)
    ) {
      return {
        ...shapes.shapeStrokeVisibility.groupBy,
        selectionDisabled: true,
      };
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeOpacity &&
      getActiveConfigSource(shapes.shapeStrokeOpacity) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeOpacity)
    ) {
      return { ...shapes.shapeStrokeOpacity.groupBy, selectionDisabled: true };
    }

    return {
      table: selectedDataTable,
      column: selectedDataGroupByColumn,
      selectionDisabled: false,
    };
  }, [
    activeSettingsCategory,
    shapes.shapeFillColor,
    shapes.shapeFillVisibility,
    shapes.shapeFillOpacity,
    shapes.shapeStrokeColor,
    shapes.shapeStrokeVisibility,
    shapes.shapeStrokeOpacity,
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
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updateShapes(shapes.id, {
                      opacity: MathUtils.clamp(newValue, 0, 1),
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
                  // TODO replace by dialog overlay
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
          <DataSourceWidget
            dataSource={shapes.dataSource}
            dataProviders={shapesDataProviders}
            onDataSourceChange={(newDataSource) => {
              // TODO signal, progress callback
              loadShapes(shapes.id, { newDataSource }).catch(console.error);
            }}
            className="bg-card"
          />
          {/* TODO layer configs */}
          <ShapesSettingsWidget
            shapes={shapes}
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
          )}{" "}
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
