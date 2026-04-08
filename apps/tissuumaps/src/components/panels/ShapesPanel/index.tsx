import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";
import { useMemo } from "react";

import { MathUtils, type Shapes, createShapes } from "@tissuumaps/core";

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
import { AddDataSourceDialog } from "@/components/widgets/AddDataSourceDialog";
import { DataSourceWidget } from "@/components/widgets/DataSourceWidget";
import { ItemsDataWidget } from "@/components/widgets/ItemsDataWidget";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { ShapesSettingsWidget } from "./ShapesSettingsWidget";
import { useShapesDataTableColumns } from "./useShapesDataTableColumns";
import { useShapesDataWidget } from "./useShapesDataWidget";

export type ShapesPanelProps = {
  className?: string;
};

export function ShapesPanel({ className }: ShapesPanelProps) {
  const shapes = useTissUUmaps((state) => state.shapes);
  const layers = useTissUUmaps((state) => state.layers);
  const shapesDataProviders = useTissUUmaps(
    (state) => state.shapesDataProviders,
  );
  const addShapes = useTissUUmaps((state) => state.addShapes);
  const loadShapes = useTissUUmaps((state) => state.loadShapes);
  const moveShapes = useTissUUmaps((state) => state.moveShapes);

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
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
        <Accordion multiple className="gap-y-2">
          {shapes.map((currentShapes, index) => (
            <ShapesAccordionItem
              key={currentShapes.id}
              shapes={currentShapes}
              index={index}
            />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataSourceDialog
        title="Add shapes"
        dataProviders={shapesDataProviders}
        onAdd={(name, _type, dataSource) => {
          const newShapes = createShapes({
            id: crypto.randomUUID(),
            name,
            dataSource: dataSource as Shapes["dataSource"],
            layerConfigs: layers.length > 0 ? [{ layer: layers[0]!.id }] : [],
          });
          addShapes(newShapes);
          loadShapes(newShapes.id).catch(console.error);
        }}
      />
    </div>
  );
}

type ShapesAccordionItemProps = {
  shapes: Shapes;
  index: number;
};

function ShapesAccordionItem({ shapes, index }: ShapesAccordionItemProps) {
  const {
    activeSettingsCategory,
    setActiveSettingsCategory,
    selectedTable,
    setSelectedTable,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  } = useShapesDataWidget(shapes);

  const loadedShapes = useTissUUmaps((state) => state.loadedShapes);
  const loadedShapesData = useTissUUmaps((state) => state.loadedShapesData);
  const shapesDataProviders = useTissUUmaps(
    (state) => state.shapesDataProviders,
  );
  const updateShapes = useTissUUmaps((state) => state.updateShapes);
  const deleteShapes = useTissUUmaps((state) => state.deleteShapes);
  const loadShapes = useTissUUmaps((state) => state.loadShapes);

  const { ref, handleRef } = useSortable({ id: shapes.id, index });

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

  const { extraTableGroupColumnDefs } = useShapesDataTableColumns(
    shapes,
    selectedTable,
    selectedGroupByColumn,
  );

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
            <InputGroup className="w-20">
              <InputGroupAddon>&alpha;</InputGroupAddon>
              <InputGroupInput
                type="number"
                inputMode="decimal"
                step={0.05}
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
