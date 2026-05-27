import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  EyeIcon,
  EyeOffIcon,
  GripVertical,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo } from "react";

import { type Layer, MathUtils, createLayer } from "@tissuumaps/core";

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
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { LayerSettingsWidget } from "./LayerSettingsWidget";

export type LayersWidgetProps = {
  className?: string;
};

export function LayersWidget({ className }: LayersWidgetProps) {
  const layers = useTissUUmaps((state) => state.layers);
  const addLayer = useTissUUmaps((state) => state.addLayer);
  const moveLayer = useTissUUmaps((state) => state.moveLayer);

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, canceled } = event.operation;
          if (isSortable(source) && !canceled) {
            moveLayer(source.id as string, source.index);
          }
        }}
      >
        <Accordion multiple className="gap-y-2">
          {layers.map((layer, index) => (
            <LayerAccordionItem key={layer.id} layer={layer} index={index} />
          ))}
        </Accordion>
      </DragDropProvider>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          const layer = createLayer({
            id: crypto.randomUUID(),
            name: `Layer ${layers.length + 1}`,
          });
          addLayer(layer);
        }}
      >
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
}

function useLayerObjects(layerId: string) {
  const images = useTissUUmaps((state) => state.images);
  const labels = useTissUUmaps((state) => state.labels);
  const points = useTissUUmaps((state) => state.points);
  const shapes = useTissUUmaps((state) => state.shapes);

  return useMemo(() => {
    const names: string[] = [];
    for (const image of images) {
      if (image.layer === layerId) names.push(image.name);
    }
    for (const l of labels) {
      if (l.layer === layerId) names.push(l.name);
    }
    for (const p of points) {
      if (p.layer === layerId) names.push(p.name);
    }
    for (const s of shapes) {
      if (s.layer === layerId) names.push(s.name);
    }
    return names;
  }, [layerId, images, labels, points, shapes]);
}

type LayerAccordionItemProps = {
  layer: Layer;
  index: number;
};

function LayerAccordionItem({ layer, index }: LayerAccordionItemProps) {
  const updateLayer = useTissUUmaps((state) => state.updateLayer);
  const deleteLayer = useTissUUmaps((state) => state.deleteLayer);

  const objectNames = useLayerObjects(layer.id);
  const hasObjects = objectNames.length > 0;

  const { ref, handleRef } = useSortable({ id: layer.id, index });

  return (
    <div ref={ref}>
      <AccordionItem
        value={layer.id}
        className="border rounded-md bg-sidebar p-2"
      >
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {layer.name}
              {hasObjects && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({objectNames.length})
                </span>
              )}
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
                value={layer.opacity}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updateLayer(layer.id, {
                      opacity: MathUtils.clamp(newValue, 0, 1),
                    });
                  }
                }}
              />
            </InputGroup>
            <Button
              variant="ghost"
              onClick={() =>
                updateLayer(layer.id, { visibility: !layer.visibility })
              }
            >
              {layer.visibility ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
            <Button
              variant="ghost"
              disabled={hasObjects}
              onClick={() => {
                // TODO replace by dialog overlay
                if (
                  window.confirm("Are you sure you want to delete this layer?")
                ) {
                  deleteLayer(layer.id);
                }
              }}
              title={
                hasObjects
                  ? "Cannot delete a layer that contains objects"
                  : "Delete layer"
              }
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          {hasObjects && (
            <div className="text-xs text-muted-foreground px-1">
              {objectNames.join(", ")}
            </div>
          )}
          <LayerSettingsWidget layer={layer} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
