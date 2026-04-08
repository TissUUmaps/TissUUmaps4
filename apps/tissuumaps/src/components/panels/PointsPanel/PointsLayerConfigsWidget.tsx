import { useCallback } from "react";

import {
  type PointsLayerConfig,
  createPointsLayerConfig,
} from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { LayerConfigsWidget } from "@/components/widgets/LayerConfigsWidget";
import { useTissUUmaps } from "@/store";

function usePointsDimensionSelector(pointsId: string | null) {
  const loadPoints = useTissUUmaps((state) => state.loadPoints);

  const suggestPointsDimensionQueries = useCallback(
    async (currentQuery: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (pointsId !== null) {
        const data = await loadPoints(pointsId, { signal });
        signal?.throwIfAborted();
        return await data.suggestDimensionQueries(currentQuery, { signal });
      }
      return [];
    },
    [pointsId, loadPoints],
  );

  const resolvePointsDimensionQuery = useCallback(
    async (query: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (pointsId !== null) {
        const data = await loadPoints(pointsId, { signal });
        signal?.throwIfAborted();
        return await data.resolveDimensionQuery(query, { signal });
      }
      return null;
    },
    [pointsId, loadPoints],
  );

  return { suggestPointsDimensionQueries, resolvePointsDimensionQuery };
}

export type PointsLayerConfigsWidgetProps = {
  pointsId: string;
  layerConfigs: PointsLayerConfig[];
  onChange: (newLayerConfigs: PointsLayerConfig[]) => void;
  className?: string;
};

export function PointsLayerConfigsWidget({
  pointsId,
  layerConfigs,
  onChange,
  className,
}: PointsLayerConfigsWidgetProps) {
  return (
    <LayerConfigsWidget
      layerConfigs={layerConfigs}
      createNewConfig={(layerId) =>
        createPointsLayerConfig({ layer: layerId, x: "", y: "" })
      }
      onChange={onChange}
      extraFieldsLabel="Coordinates"
      renderExtraFields={(config, update) => (
        <PointsCoordinateFields
          pointsId={pointsId}
          config={config}
          onUpdate={update}
        />
      )}
      className={className}
    />
  );
}

type PointsCoordinateFieldsProps = {
  pointsId: string;
  config: PointsLayerConfig;
  onUpdate: (updates: Partial<PointsLayerConfig>) => void;
};

function PointsCoordinateFields({
  pointsId,
  config,
  onUpdate,
}: PointsCoordinateFieldsProps) {
  const { suggestPointsDimensionQueries, resolvePointsDimensionQuery } =
    usePointsDimensionSelector(pointsId);

  return (
    <>
      <Field>
        <FieldLabel>X column</FieldLabel>
        <SimpleAsyncCombobox
          suggestQueries={suggestPointsDimensionQueries}
          getItem={resolvePointsDimensionQuery}
          itemQuery={(col) => col}
          selectedItem={config.x || null}
          onSelectedItemChange={(col) => onUpdate({ x: col ?? "" })}
        />
      </Field>
      <Field>
        <FieldLabel>Y column</FieldLabel>
        <SimpleAsyncCombobox
          suggestQueries={suggestPointsDimensionQueries}
          getItem={resolvePointsDimensionQuery}
          itemQuery={(col) => col}
          selectedItem={config.y || null}
          onSelectedItemChange={(col) => onUpdate({ y: col ?? "" })}
        />
      </Field>
    </>
  );
}
