import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect } from "react";

import {
  ChannelViewMode,
  ColorUtils,
  type Image,
  type ImageChannel,
  type ImageData,
  ImageUtils,
} from "@tissuumaps/core";

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
  const setChannelPreview = useAppStore((state) => state.setChannelPreview);

  // End the preview when the widget goes away while a channel is hovered
  useEffect(() => () => setChannelPreview(null), [setChannelPreview]);

  const rows = Array.from({ length: sizeC }, (_, c) => (
    <ChannelSettingsRow key={c} image={image} data={data} channelIndex={c} />
  ));

  return (
    <div className={cn("flex flex-col gap-y-2", className)}>
      <ToggleGroup
        value={[image.channelViewMode]}
        onValueChange={(value) => {
          if (value.length > 0) {
            updateImage(image.id, {
              channelViewMode: value[0] as ChannelViewMode,
            });
          }
        }}
        className="border rounded"
      >
        {Object.values(ChannelViewMode).map((mode) => (
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
      {image.channelViewMode !== ChannelViewMode.composite ? (
        <RadioGroup
          value={String(ImageUtils.getActiveChannel(image, sizeC))}
          onValueChange={(value) => {
            if (typeof value === "string") {
              updateImage(image.id, { activeChannel: Number(value) });
            }
          }}
          className="flex flex-col gap-y-2"
        >
          {rows}
        </RadioGroup>
      ) : (
        <div className="flex flex-col gap-y-2">{rows}</div>
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
  const setChannelPreview = useAppStore((state) => state.setChannelPreview);

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
    <div className={cn("flex flex-col gap-y-1", className)}>
      <div className="flex flex-row items-center gap-x-2">
        {image.channelViewMode !== ChannelViewMode.composite ? (
          <RadioGroupItem value={String(c)} aria-label={name} />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label={visible ? "Hide channel" : "Show channel"}
            onClick={() => {
              updateChannel({ visibility: !visible });
              setChannelPreview(null);
            }}
            onPointerEnter={() =>
              setChannelPreview({ imageId: image.id, channelIndex: c })
            }
            onPointerLeave={() => setChannelPreview(null)}
          >
            {visible ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        )}
        {image.channelViewMode !== ChannelViewMode.grayscale ? (
          <span onKeyDown={stopRadioGroupKeys}>
            <SimpleColorPicker
              color={color}
              onColorChange={(newColor) => updateChannel({ color: newColor })}
              // positions the sr-only label, which would otherwise overflow the
              // panel's scroll container
              className="relative size-6 p-0 border-input shadow-xs"
            >
              <span className="sr-only">Channel color</span>
              <span
                className="block size-full rounded-sm"
                style={{ backgroundColor: ColorUtils.toHex(color) }}
              />
            </SimpleColorPicker>
          </span>
        ) : null}
        <span className="flex-1 truncate" title={name}>
          {name}
        </span>
        <span className="flex flex-row items-center gap-x-1">
          <span className="text-muted-foreground text-sm" aria-hidden>
            &alpha;
          </span>
          <Slider
            className="w-16"
            thumbLabels={["Channel opacity"]}
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onValueChange={(value) => updateChannel({ opacity: value })}
            onKeyDown={stopRadioGroupKeys}
          />
        </span>
      </div>
      {contrastLimits !== undefined ? (
        <div className="pl-11" onKeyDown={stopRadioGroupKeys}>
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
        </div>
      ) : null}
    </div>
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
