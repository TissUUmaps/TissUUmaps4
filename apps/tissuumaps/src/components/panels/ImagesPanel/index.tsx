import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";

import type { Image } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  PanelItemsAccordion,
  PanelItemsAccordionHeader,
  PanelItemsAccordionItem,
  PanelItemsAccordionPanel,
  PanelItemsAccordionTrigger,
  PanelItemsAccordionTriggerIcon,
} from "../../common/PanelItemsAccordion";
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
      <PanelItemsAccordion className={className} multiple>
        {images.map((image, index) => (
          <SortableImagesPanelItem key={image.id} image={image} index={index} />
        ))}
      </PanelItemsAccordion>
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
    <PanelItemsAccordionItem render={<div ref={ref} />}>
      <PanelItemsAccordionHeader>
        <GripVertical ref={handleRef} />
        <PanelItemsAccordionTrigger>{image.name}</PanelItemsAccordionTrigger>
        <PanelItemsAccordionTriggerIcon className="ml-auto" />
      </PanelItemsAccordionHeader>
      <PanelItemsAccordionPanel>
        <ImagesPanelItem image={image} />
      </PanelItemsAccordionPanel>
    </PanelItemsAccordionItem>
  );
}
