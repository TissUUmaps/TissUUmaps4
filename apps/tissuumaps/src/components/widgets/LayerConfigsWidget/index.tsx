import { PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode } from "react";

import { type LayerConfig } from "@tissuumaps/core";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerRightDownIcon,
} from "@/components/common/accordion";
import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

// ─── Shared base widget ───────────────────────────────────────────────────────

type LayerConfigUpdate = Partial<LayerConfig> & Record<string, unknown>;

type LayerConfigsWidgetProps<T extends LayerConfig> = {
  layerConfigs: T[];
  createNewConfig: (layerId: string) => T;
  onChange: (newLayerConfigs: T[]) => void;
  renderExtraFields?: (
    config: T,
    update: (updates: Partial<T>) => void,
  ) => ReactNode;
  extraFieldsLabel?: string;
  className?: string;
};

export function LayerConfigsWidget<T extends LayerConfig>({
  layerConfigs,
  createNewConfig,
  onChange,
  renderExtraFields,
  extraFieldsLabel = "Extra",
  className,
}: LayerConfigsWidgetProps<T>) {
  const layers = useTissUUmaps((state) => state.layers);

  const addConfig = () => {
    if (layers.length === 0) return;
    onChange([...layerConfigs, createNewConfig(layers[0]!.id)]);
  };

  const removeConfig = (index: number) => {
    onChange(layerConfigs.filter((_, i) => i !== index));
  };

  const updateConfig = (index: number, updates: LayerConfigUpdate) => {
    onChange(
      layerConfigs.map((config, i) =>
        i === index ? ({ ...config, ...updates } as T) : config,
      ),
    );
  };

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Layer configs
      </FieldsetLegend>

      {layerConfigs.length === 0 && (
        <p className="text-sm text-muted-foreground">No layer configs</p>
      )}

      {layerConfigs.map((config, index) => {
        const layerId = typeof config.layer === "string" ? config.layer : null;
        const layerName =
          layers.find((l) => l.id === layerId)?.name ??
          layerId ??
          `Config ${index + 1}`;

        return (
          <LayerConfigItem
            key={index}
            config={config}
            layers={layers}
            layerName={layerName}
            onUpdate={(updates) => updateConfig(index, updates)}
            onRemove={() => removeConfig(index)}
            renderExtraFields={
              renderExtraFields
                ? (c, u) =>
                    renderExtraFields(c as T, (updates) =>
                      u(updates as LayerConfigUpdate),
                    )
                : undefined
            }
            extraFieldsLabel={extraFieldsLabel}
          />
        );
      })}

      <Button
        variant="outline"
        className="w-full"
        onClick={addConfig}
        disabled={layers.length === 0}
        title={layers.length === 0 ? "No layers available" : undefined}
      >
        <PlusIcon className="size-4" />
        Add layer config
      </Button>
    </Fieldset>
  );
}

// ─── Single config item ───────────────────────────────────────────────────────

type StoreLayer = { id: string; name: string };

type LayerConfigItemProps = {
  config: LayerConfig;
  layers: StoreLayer[];
  layerName: string;
  onUpdate: (updates: LayerConfigUpdate) => void;
  onRemove: () => void;
  renderExtraFields?: (
    config: LayerConfig,
    update: (updates: LayerConfigUpdate) => void,
  ) => ReactNode;
  extraFieldsLabel: string;
};

function LayerConfigItem({
  config,
  layers,
  layerName,
  onUpdate,
  onRemove,
  renderExtraFields,
  extraFieldsLabel,
}: LayerConfigItemProps) {
  const layerValue =
    typeof config.layer === "string" ? config.layer : "(table-based)";
  const isTableBased = typeof config.layer !== "string";

  return (
    <div className="border rounded-md bg-background">
      {/* Config header: layer name + delete */}
      <div className="flex flex-row items-center px-2 py-1 gap-x-2">
        <span className="flex-1 text-sm font-medium truncate">{layerName}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          title="Remove layer config"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      {/* Sub-accordions */}
      <Accordion className="border-t">
        {/* Layer section */}
        <AccordionItem value="layer">
          <AccordionHeader className="px-2">
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Layer</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
            <Field>
              <FieldLabel>Layer</FieldLabel>
              {isTableBased ? (
                <Input
                  disabled
                  value={`table: ${(config.layer as { table: string; column: string }).table} / ${(config.layer as { table: string; column: string }).column}`}
                  readOnly
                />
              ) : (
                <select
                  className="w-full border rounded-md px-2 py-1 text-sm bg-background text-foreground"
                  value={layerValue}
                  onChange={(e) => onUpdate({ layer: e.target.value })}
                >
                  {layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                  {layers.length === 0 && (
                    <option value={layerValue}>{layerValue}</option>
                  )}
                </select>
              )}
            </Field>
          </AccordionPanel>
        </AccordionItem>

        {/* Transform section */}
        <AccordionItem value="transform">
          <AccordionHeader className="px-2">
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Transform</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="grid grid-cols-2 gap-x-2 gap-y-2 p-2 pl-6 pb-4">
            <Field className="col-span-2">
              <FieldLabel>Flip</FieldLabel>
              <div className="flex flex-row items-center gap-x-2">
                <Switch
                  checked={config.flip}
                  onCheckedChange={(checked) => onUpdate({ flip: checked })}
                />
                {config.flip ? "Yes" : "No"}
              </div>
            </Field>
            <Field>
              <FieldLabel>Scale</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                step={0.1}
                value={config.transform.scale}
                onChange={(e) => {
                  if (e.target.value !== "") {
                    onUpdate({
                      transform: {
                        ...config.transform,
                        scale: parseFloat(e.target.value),
                      },
                    });
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Rotation (°)</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                step={1}
                value={config.transform.rotation}
                onChange={(e) => {
                  if (e.target.value !== "") {
                    onUpdate({
                      transform: {
                        ...config.transform,
                        rotation: parseFloat(e.target.value),
                      },
                    });
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Translate X</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                step={1}
                value={config.transform.translation.x}
                onChange={(e) => {
                  if (e.target.value !== "") {
                    onUpdate({
                      transform: {
                        ...config.transform,
                        translation: {
                          ...config.transform.translation,
                          x: parseFloat(e.target.value),
                        },
                      },
                    });
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Translate Y</FieldLabel>
              <Input
                type="number"
                inputMode="decimal"
                step={1}
                value={config.transform.translation.y}
                onChange={(e) => {
                  if (e.target.value !== "") {
                    onUpdate({
                      transform: {
                        ...config.transform,
                        translation: {
                          ...config.transform.translation,
                          y: parseFloat(e.target.value),
                        },
                      },
                    });
                  }
                }}
              />
            </Field>
          </AccordionPanel>
        </AccordionItem>

        {/* Extra section (type-specific fields) */}
        {renderExtraFields && (
          <AccordionItem value="extra">
            <AccordionHeader className="px-2">
              <AccordionTriggerRightDownIcon />
              <AccordionTrigger>{extraFieldsLabel}</AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel className="flex flex-col p-2 pl-6 pb-4 gap-2">
              {renderExtraFields(config, onUpdate)}
            </AccordionPanel>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
