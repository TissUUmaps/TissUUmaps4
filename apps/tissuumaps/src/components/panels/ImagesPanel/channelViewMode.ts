import { ImageChannelViewMode } from "@tissuumaps/core";

export const channelViewModeLabels: Record<ImageChannelViewMode, string> = {
  [ImageChannelViewMode.composite]: "Composite",
  [ImageChannelViewMode.grayscale]: "Grayscale",
  [ImageChannelViewMode.color]: "Color",
};
