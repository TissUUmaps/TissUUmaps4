import {
  type ShapesLayerConfig,
  createShapesLayerConfig,
} from "@tissuumaps/core";

import { LayerConfigsWidget } from "@/components/widgets/LayerConfigsWidget";

export type ShapesLayerConfigsWidgetProps = {
  layerConfigs: ShapesLayerConfig[];
  onChange: (newLayerConfigs: ShapesLayerConfig[]) => void;
  className?: string;
};

export function ShapesLayerConfigsWidget({
  layerConfigs,
  onChange,
  className,
}: ShapesLayerConfigsWidgetProps) {
  return (
    <LayerConfigsWidget
      layerConfigs={layerConfigs}
      createNewConfig={(layerId) => createShapesLayerConfig({ layer: layerId })}
      onChange={onChange}
      className={className}
    />
  );
}
