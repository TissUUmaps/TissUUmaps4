import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import type { Image } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
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
          <SortableImagesPanelItem key={image.id} image={image} index={index} />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

function SortableImagesPanelItem({
  image,
  index,
}: {
  image: Image;
  index: number;
}) {
  const { ref, handleRef } = useSortable({ id: image.id, index });

  return (
    <div ref={ref}>
      <AccordionItem>
        <AccordionTrigger>
          <GripVertical ref={handleRef} />
          {image.name}
        </AccordionTrigger>
        <AccordionContent>
          <ImagesPanelItem image={image} />
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
