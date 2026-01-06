import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { GripVertical } from "lucide-react";
import type { HTMLProps } from "react";

import { useTissUUmaps } from "../../../store";
import { ImageItem } from "./ImageItem";

export function ImagesPanel(props: HTMLProps<HTMLDivElement>) {
  const images = useTissUUmaps((state) => state.images);
  const moveImage = useTissUUmaps((state) => state.moveImage);

  return (
    <div {...props}>
      <Sortable
        value={images}
        getItemValue={(image) => image.id}
        onMove={(event) =>
          moveImage(images[event.activeIndex]!.id, event.overIndex)
        }
      >
        <Accordion multiple>
          <SortableContent>
            {images.map((image) => (
              <SortableItem key={image.id} value={image.id} asChild>
                <AccordionItem>
                  <AccordionTrigger>
                    <SortableItemHandle>
                      <GripVertical />
                    </SortableItemHandle>
                    {image.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ImageItem image={image} />
                  </AccordionContent>
                </AccordionItem>
              </SortableItem>
            ))}
          </SortableContent>
        </Accordion>
      </Sortable>
    </div>
  );
}
