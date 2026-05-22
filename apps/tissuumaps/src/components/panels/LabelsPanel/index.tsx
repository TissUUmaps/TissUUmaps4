import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { EyeIcon, EyeOffIcon, GripVertical, Trash2Icon } from "lucide-react";
import { useMemo } from "react";

import { type Labels, MathUtils, createLabels } from "@tissuumaps/core";

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
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { LabelsSettingsWidget } from "./LabelsSettingsWidget";
import { useLabelsDataTableColumns } from "./useLabelsDataTableColumns";
import { useLabelsDataWidget } from "./useLabelsDataWidget";

export type LabelsPanelProps = {
  className?: string;
};

export function LabelsPanel({ className }: LabelsPanelProps) {
  const labels = useTissUUmaps((state) => state.labels);
  const layers = useTissUUmaps((state) => state.layers);
  const labelsDataProviders = useTissUUmaps(
    (state) => state.labelsDataProviders,
  );
  const addLabels = useTissUUmaps((state) => state.addLabels);
  const moveLabels = useTissUUmaps((state) => state.moveLabels);

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, canceled } = event.operation;
          if (isSortable(source) && !canceled) {
            // dnd-kit optimistically updates the DOM
            // https://github.com/clauderic/dnd-kit/issues/1564
            moveLabels(source.id as string, source.index);
          }
        }}
      >
        <Accordion multiple className="gap-y-2">
          {labels.map((currentLabels, index) => (
            <LabelsAccordionItem
              key={currentLabels.id}
              labels={currentLabels}
              index={index}
            />
          ))}
        </Accordion>
      </DragDropProvider>
      <AddDataObjectDialog
        title="Add labels"
        dataProviders={labelsDataProviders}
        onAdd={(name, _type, dataSource) => {
          const newLabels = createLabels({
            id: crypto.randomUUID(),
            name,
            dataSource,
            layer: layers[0]!.id, // FIXME
          });
          addLabels(newLabels);
        }}
      />
    </div>
  );
}

type LabelsAccordionItemProps = {
  labels: Labels;
  index: number;
};

function LabelsAccordionItem({ labels, index }: LabelsAccordionItemProps) {
  const {
    activeSettingsCategory,
    setActiveSettingsCategory,
    selectedTable,
    setSelectedTable,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  } = useLabelsDataWidget(labels);

  const loadedLabels = useTissUUmaps((state) => state.loadedLabels);
  const loadedLabelsData = useTissUUmaps((state) => state.loadedLabelsData);
  const labelsDataProviders = useTissUUmaps(
    (state) => state.labelsDataProviders,
  );
  const updateLabels = useTissUUmaps((state) => state.updateLabels);
  const deleteLabels = useTissUUmaps((state) => state.deleteLabels);
  const loadLabels = useTissUUmaps((state) => state.loadLabels);

  const { ref, handleRef } = useSortable({ id: labels.id, index });

  const data = useMemo(() => {
    const loadedDataKey = loadedLabels.get(labels.id);
    if (loadedDataKey !== undefined) {
      const loadedData = loadedLabelsData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    return null;
  }, [labels.id, loadedLabels, loadedLabelsData]);

  const { extraTableGroupColumnDefs } = useLabelsDataTableColumns(
    labels,
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
              {labels.name}
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
                value={labels.opacity}
                onChange={(event) => {
                  const newValue = event.target.valueAsNumber;
                  if (!isNaN(newValue)) {
                    updateLabels(labels.id, {
                      opacity: MathUtils.clamp(newValue, 0, 1),
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
                  // TODO replace by dialog overlay
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
          <DataSourceWidget
            dataSource={labels.dataSource}
            dataProviders={labelsDataProviders}
            onDataSourceChange={(newDataSource) => {
              // TODO signal, progress callback
              loadLabels(labels.id, { newDataSource }).catch(console.error);
            }}
            className="bg-card"
          />
          {/* TODO layer configs */}
          <LabelsSettingsWidget
            labels={labels}
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
