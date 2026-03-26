import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

import { type Image } from "@tissuumaps/core";

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
import { ImagesLayersPanel } from "./ImagesLayersPanel";
import { ImagesSettingsPanel } from "./ImagesSettingsPanel";
import { ImagesSourcePanel } from "./ImagesSourcePanel";

export type ImagesPanelProps = {
  className?: string;
};

export function ImagesPanel({ className }: ImagesPanelProps) {
  const images = useTissUUmaps((state) => state.images);
  const moveImage = useTissUUmaps((state) => state.moveImage);

  return (
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
      <Accordion className={className} multiple>
        {images.map((image, index) => (
          <ImageAccordionItem key={image.id} image={image} index={index} />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

type ImageAccordionItemProps = {
  image: Image;
  index: number;
};

function ImageAccordionItem({ image, index }: ImageAccordionItemProps) {
  const updateImage = useTissUUmaps((state) => state.updateImage);
  const deleteImage = useTissUUmaps((state) => state.deleteImage);

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
            <InputGroup className="w-24">
              <InputGroupAddon>OPA</InputGroupAddon>
              <InputGroupInput
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={image.opacity}
                onChange={(event) => {
                  const opacity = event.target.valueAsNumber;
                  if (Number.isFinite(opacity)) {
                    updateImage(image.id, {
                      opacity: Math.min(Math.max(0, opacity), 1),
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
          <ImagesSourcePanel image={image} className="bg-card" />
          <ImagesSettingsPanel image={image} className="bg-card" />
          <ImagesLayersPanel image={image} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
