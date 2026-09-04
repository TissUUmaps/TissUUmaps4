import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";

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
import { AddDataObjectDialog } from "@/components/widgets/AddDataObjectDialog";
import { DataSourceWidget } from "@/components/widgets/DataSourceWidget";
import { ItemsDataWidget } from "@/components/widgets/ItemsDataWidget";
import { useShapesData } from "@/hooks/useData";
import { useFocusObjectHandler } from "@/hooks/useFocusObjectHandler";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";
import { useProjectStore } from "@/stores/project";

import { ShapesSettingsWidget } from "./ShapesSettingsWidget";
import { useShapesDataTableColumns } from "./useShapesDataTableColumns";
import { useShapesDataWidget } from "./useShapesDataWidget";

export type ShapesPanelProps = {
  className?: string;
};

export function ShapesPanel({ className }: ShapesPanelProps) {
  const shapesDataProviders = useAppStore((state) => state.shapesDataProviders);

  const layers = useProjectStore((state) => state.layers);
  const shapes = useProjectStore((state) => state.shapes);
  const addShapes = useProjectStore((state) => state.addShapes);
  const moveShapes = useProjectStore((state) => state.moveShapes);

  // Controlled accordion so notifications can expand a specific shape layer.
  const [openIds, setOpenIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusObjectHandler("shapes", (id) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    containerRef.current
      ?.querySelector(`[data-object-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  });

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-y-2", className)}>
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
        <Accordion
          multiple
          value={openIds}
          onValueChange={setOpenIds}
          className="gap-y-2"
        >
          {shapes.map((currentShapes, index) => (
            <ShapesAccordionItem
              key={currentShapes.id}
              shapes={currentShapes}
              index={index}
            />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataObjectDialog
        title="Add shapes"
        layers={layers}
        dataProviders={shapesDataProviders}
        onAdd={(name, layerId, dataSource) => {
          if (!layerId) return;
          const newShapes = createShapes({
            id: crypto.randomUUID(),
            name,
            dataSource,
            layer: layerId,
          });
          addShapes(newShapes);
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
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  } = useShapesDataWidget(shapes);

  const shapesDataProviders = useAppStore((state) => state.shapesDataProviders);

  const updateShapes = useProjectStore((state) => state.updateShapes);
  const deleteShapes = useProjectStore((state) => state.deleteShapes);

  const shapesData = useShapesData(shapes.id);

  const { extraTableGroupColumnDefs } = useShapesDataTableColumns(
    shapes,
    selectedGroupByColumn,
  );

  const { ref, handleRef } = useSortable({ id: shapes.id, index });

  return (
    <div ref={ref} data-object-id={shapes.id}>
      <AccordionItem
        value={shapes.id}
        className="border rounded-md bg-sidebar p-2"
      >
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
              updateShapes(shapes.id, { dataSource: newDataSource });
            }}
            className="bg-card"
          />
          <ShapesSettingsWidget
            shapes={shapes}
            activeCategory={activeSettingsCategory}
            onActiveCategoryChange={setActiveSettingsCategory}
            className="bg-card"
          />
          {shapesData !== null && (
            <ItemsDataWidget
              data={shapesData}
              tableHeight={200}
              table={shapes.dataSource.table ?? null}
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
