import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

import { type Image, MathUtils, createImage } from "@tissuumaps/core";

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
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { ImageSettingsWidget } from "./ImageSettingsWidget";

export type ImagesPanelProps = {
  className?: string;
};

export function ImagesPanel({ className }: ImagesPanelProps) {
  const images = useTissUUmaps((state) => state.images);
  const layers = useTissUUmaps((state) => state.layers);
  const imageDataProviders = useTissUUmaps((state) => state.imageDataProviders);
  const addImage = useTissUUmaps((state) => state.addImage);
  const moveImage = useTissUUmaps((state) => state.moveImage);

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, canceled } = event.operation;
          if (isSortable(source) && !canceled) {
            // dnd-kit optimistically updates the DOM
            // https://github.com/clauderic/dnd-kit/issues/1564
            moveImage(source.id as string, source.index);
          }
        }}
      >
        <Accordion multiple className="gap-y-2">
          {images.map((image, index) => (
            <ImageAccordionItem key={image.id} image={image} index={index} />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataObjectDialog
        title="Add image"
        layers={layers}
        dataProviders={imageDataProviders}
        onAdd={(name, layerId, dataSource) => {
          if (!layerId) return;
          const image = createImage({
            id: crypto.randomUUID(),
            name,
            dataSource,
            layer: layerId,
          });
          addImage(image);
        }}
      />
    </div>
  );
}

type ImageAccordionItemProps = {
  image: Image;
  index: number;
};

function ImageAccordionItem({ image, index }: ImageAccordionItemProps) {
  const imageDataProviders = useTissUUmaps((state) => state.imageDataProviders);
  const updateImage = useTissUUmaps((state) => state.updateImage);
  const deleteImage = useTissUUmaps((state) => state.deleteImage);
  const loadImage = useTissUUmaps((state) => state.loadImage);

  const { ref, handleRef } = useSortable({ id: image.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {image.name}
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
                value={image.opacity}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updateImage(image.id, {
                      opacity: MathUtils.clamp(newValue, 0, 1),
                    });
                  }
                }}
              />
            </InputGroup>
            <Button
              variant="ghost"
              onClick={() =>
                updateImage(image.id, { visibility: !image.visibility })
              }
            >
              {image.visibility ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                // TODO replace by dialog overlay
                if (
                  window.confirm("Are you sure you want to delete this image?")
                ) {
                  deleteImage(image.id);
                }
              }}
              title="Delete image"
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          <DataSourceWidget
            dataSource={image.dataSource}
            dataProviders={imageDataProviders}
            onDataSourceChange={(newDataSource) => {
              // TODO signal, progress callback
              loadImage(image.id, { newDataSource }).catch(console.error);
            }}
            className="bg-card"
          />
          <ImageSettingsWidget image={image} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
