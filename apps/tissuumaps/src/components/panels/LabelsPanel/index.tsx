import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";

import { type Labels, MathUtils } from "@tissuumaps/core";

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
import { useTissUUmaps } from "@/store";

import { LabelsLayersPanel } from "./LabelsLayersPanel";
import { LabelsSettingsPanel } from "./LabelsSettingsPanel";
import { LabelsSourcePanel } from "./LabelsSourcePanel";

export type LabelsPanelProps = {
  className?: string;
};

export function LabelsPanel({ className }: LabelsPanelProps) {
  const labels = useTissUUmaps((state) => state.labels);
  const moveLabels = useTissUUmaps((state) => state.moveLabels);

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, canceled } = event.operation;
        if (isSortable(source) && !canceled) {
          moveLabels(source.id as string, source.index);
        }
      }}
    >
      <Accordion className={className} multiple>
        {labels.map((currentLabels, index) => (
          <LabelsAccordionItem
            key={currentLabels.id}
            labels={currentLabels}
            index={index}
          />
        ))}
      </Accordion>
    </DragDropProvider>
  );
}

type LabelsAccordionItemProps = {
  labels: Labels;
  index: number;
};

function LabelsAccordionItem({ labels, index }: LabelsAccordionItemProps) {
  const updateLabels = useTissUUmaps((state) => state.updateLabels);
  const deleteLabels = useTissUUmaps((state) => state.deleteLabels);

  const { ref, handleRef } = useSortable({ id: labels.id, index });

  return (
    <div ref={ref}>
      <AccordionItem className="border rounded-md bg-sidebar p-2">
        <AccordionHeader>
          <GripVertical ref={handleRef} />
          <div className="flex-1 w-full">
            <AccordionTrigger className="w-full cursor-pointer">
              {labels.name}
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
                value={labels.opacity}
                onChange={(event) => {
                  if (event.target.value !== "") {
                    updateLabels(labels.id, {
                      opacity: MathUtils.clamp(
                        parseFloat(event.target.value),
                        0,
                        1,
                      ),
                    });
                  }
                }}
              />
            </InputGroup>
            <Button
              variant="ghost"
              onClick={() =>
                updateLabels(labels.id, { visibility: !labels.visibility })
              }
            >
              {labels.visibility ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete these labels?",
                  )
                ) {
                  deleteLabels(labels.id);
                }
              }}
              title="Delete labels"
            >
              <Trash2Icon />
            </Button>
          </div>
          <AccordionTriggerUpDownIcon />
        </AccordionHeader>
        <AccordionPanel className="pt-2 flex flex-col gap-y-2">
          <LabelsSourcePanel labels={labels} className="bg-card" />
          <LabelsSettingsPanel labels={labels} className="bg-card" />
          <LabelsLayersPanel labels={labels} className="bg-card" />
        </AccordionPanel>
      </AccordionItem>
    </div>
  );
}
