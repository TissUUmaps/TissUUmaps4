import {
  type ImageLayerConfig,
  createImageLayerConfig,
} from "@tissuumaps/core";

import { LayerConfigsWidget } from "@/components/widgets/LayerConfigsWidget";

export type ImageLayerConfigsWidgetProps = {
  layerConfigs: ImageLayerConfig[];
  onChange: (newLayerConfigs: ImageLayerConfig[]) => void;
  className?: string;
};

export function ImageLayerConfigsWidget({
  layerConfigs,
  onChange,
  className,
}: ImageLayerConfigsWidgetProps) {
  return (
    <LayerConfigsWidget
      layerConfigs={layerConfigs}
      createNewConfig={(layerId) => createImageLayerConfig({ layer: layerId })}
      onChange={onChange}
      className={className}
    />
  );
}
