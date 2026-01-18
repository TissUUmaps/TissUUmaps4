import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import type { Image } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerUpIcon,
} from "../../common/accordion";
import { ImagesPanelItem } from "./ImagesPanelItem";

export function ImagesPanel({ className }: { className?: string }) {
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

function ImageAccordionItem({ image, index }: { image: Image; index: number }) {
  const { ref, handleRef } = useSortable({ id: image.id, index });
  return (
    <AccordionItem render={<div ref={ref} />}>
      <AccordionHeader>
        <GripVertical ref={handleRef} />
        <AccordionTrigger>{image.name}</AccordionTrigger>
        <AccordionTriggerUpIcon className="ml-auto" />
      </AccordionHeader>
      <AccordionPanel>
        <ImagesPanelItem image={image} />
      </AccordionPanel>
    </AccordionItem>
  );
}
