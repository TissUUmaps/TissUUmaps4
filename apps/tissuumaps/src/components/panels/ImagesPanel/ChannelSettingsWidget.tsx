import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ColorUtils,
  type Image,
  type ImageChannel,
  ImageChannelViewMode,
  type ImageData,
  ImageUtils,
} from "@tissuumaps/core";

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerRightDownIcon,
} from "@/components/common/accordion";
import { SimpleColorPicker } from "@/components/common/simple-color-picker";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";
import { useProjectStore } from "@/stores/project";

import { ContrastRangeWidget } from "./ContrastRangeWidget";
import { channelViewModeLabels } from "./channelViewMode";

export type ChannelSettingsWidgetProps = {
  image: Image;
  data: ImageData;
  sizeC: number;
  className?: string;
};

export function ChannelSettingsWidget({
  image,
  data,
  sizeC,
  className,
}: ChannelSettingsWidgetProps) {
  const updateImage = useProjectStore((state) => state.updateImage);
  const setImageChannelPreview = useAppStore(
    (state) => state.setImageChannelPreview,
  );
  const [expandedChannels, setExpandedChannels] = useState<number[]>([]);

  // End the preview when the widget goes away while a channel is hovered
  useEffect(() => () => setImageChannelPreview(null), [setImageChannelPreview]);

  const rows = (
    <Accordion
      multiple
      value={expandedChannels}
      onValueChange={(value) => setExpandedChannels(value as number[])}
      className="gap-y-1"
    >
      {Array.from({ length: sizeC }, (_, c) => (
        <ChannelSettingsRow
          key={c}
          image={image}
          data={data}
          channelIndex={c}
        />
      ))}
    </Accordion>
  );

  return (
    <div className={cn("flex flex-col gap-y-2 text-sm", className)}>
      <ToggleGroup
        size="sm"
        value={[image.channelViewMode]}
        onValueChange={(value) => {
          if (value.length > 0) {
            updateImage(image.id, {
              channelViewMode: value[0] as ImageChannelViewMode,
            });
          }
        }}
        className="border rounded"
      >
        {Object.values(ImageChannelViewMode).map((mode) => (
          <ToggleGroupItem
            key={mode}
            value={mode}
            className={
              image.channelViewMode === mode ? "font-medium" : "font-normal"
            }
          >
            {channelViewModeLabels[mode]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {image.channelViewMode !== ImageChannelViewMode.composite ? (
        <RadioGroup
          value={String(ImageUtils.getActiveChannel(image, sizeC))}
          onValueChange={(value) => {
            if (typeof value === "string") {
              updateImage(image.id, { activeChannel: Number(value) });
            }
          }}
        >
          {rows}
        </RadioGroup>
      ) : (
        rows
      )}
    </div>
  );
}

type ChannelSettingsRowProps = {
  image: Image;
  data: ImageData;
  channelIndex: number;
  className?: string;
};

function ChannelSettingsRow({
  image,
  data,
  channelIndex: c,
  className,
}: ChannelSettingsRowProps) {
  const updateImage = useProjectStore((state) => state.updateImage);
  const setImageChannelPreview = useAppStore(
    (state) => state.setImageChannelPreview,
  );

  const channel = image.channels?.[c];
  const name = channel?.name ?? data.getChannelName?.(c) ?? `Channel ${c}`;
  const color = ImageUtils.getChannelColor(image, data, c);
  const contrastLimits = ImageUtils.getChannelContrastLimits(image, data, c);
  const visible = ImageUtils.getChannelVisibility(image, data, c);
  const opacity = ImageUtils.getChannelOpacity(image, data, c);

  const updateChannel = (updates: Partial<ImageChannel>) => {
    const channels = Array.from(
      { length: Math.max(c + 1, image.channels?.length ?? 0) },
      (_, i) => image.channels?.[i] ?? {},
    );
    channels[c] = { ...channels[c], ...updates };
    updateImage(image.id, { channels });
  };

  return (
    <AccordionItem
      value={c}
      disabled={contrastLimits === undefined}
      className={className}
    >
      <AccordionHeader className="gap-x-1.5">
        <AccordionTriggerRightDownIcon className="[&_svg]:size-4" />
        {image.channelViewMode !== ImageChannelViewMode.composite ? (
          <RadioGroupItem value={String(c)} aria-label={name} />
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={visible ? "Hide channel" : "Show channel"}
            onClick={() => {
              updateChannel({ visibility: !visible });
              setImageChannelPreview(null);
            }}
            onPointerEnter={() =>
              setImageChannelPreview({ imageId: image.id, channelIndex: c })
            }
            onPointerLeave={() => setImageChannelPreview(null)}
          >
            {visible ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        )}
        {image.channelViewMode !== ImageChannelViewMode.grayscale ? (
          <span onKeyDown={stopRadioGroupKeys}>
            <SimpleColorPicker
              color={color}
              onColorChange={(newColor) => updateChannel({ color: newColor })}
              // positions the sr-only label, which would otherwise overflow the
              // panel's scroll container
              className="relative size-4 p-0 border-input shadow-xs"
            >
              <span className="sr-only">Channel color</span>
              <span
                className="block size-full rounded-sm"
                style={{ backgroundColor: ColorUtils.toHex(color) }}
              />
            </SimpleColorPicker>
          </span>
        ) : null}
        <AccordionTrigger className="flex-1 min-w-0 cursor-pointer">
          <span className="truncate" title={name}>
            {name}
          </span>
        </AccordionTrigger>
        <span className="flex flex-row items-center gap-x-1">
          <span className="text-muted-foreground text-xs" aria-hidden>
            &alpha;
          </span>
          <Slider
            className="w-14"
            thumbAlignment="edge"
            thumbLabels={["Channel opacity"]}
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onValueChange={(value) => updateChannel({ opacity: value })}
            onKeyDown={stopRadioGroupKeys}
          />
        </span>
      </AccordionHeader>
      {contrastLimits !== undefined ? (
        <AccordionPanel className="pt-1 pl-5" onKeyDown={stopRadioGroupKeys}>
          <ContrastRangeWidget
            contrastLimits={contrastLimits}
            histogram={data.getChannelHistogram?.(c)}
            dataTypeRange={data.getChannelDataTypeRange?.(c)}
            onContrastLimitsChange={(newContrastLimits) =>
              updateChannel({ contrastLimits: newContrastLimits })
            }
            onReset={
              channel?.contrastLimits !== undefined
                ? () => updateChannel({ contrastLimits: undefined })
                : undefined
            }
          />
        </AccordionPanel>
      ) : null}
    </AccordionItem>
  );
}

// Base UI's radio group moves the active channel on these keys from any
// element inside it but text inputs, which leaves out number inputs and the
// color picker's sliders
function stopRadioGroupKeys(event: React.KeyboardEvent) {
  if (
    event.key.startsWith("Arrow") ||
    event.key === "Home" ||
    event.key === "End"
  ) {
    event.stopPropagation();
  }
}
