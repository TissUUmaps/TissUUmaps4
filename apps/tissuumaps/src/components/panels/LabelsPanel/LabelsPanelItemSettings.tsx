import { JsonForms } from "@jsonforms/react";
import { useMemo, useState } from "react";

import {
  type Labels,
  type LabelsDataSource,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerRightDownIcon,
} from "../../common/accordion";
import {
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";
import { useColorConfigControl } from "../../controls/ColorConfigControl/useColorConfigControl";
import {
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import { useOpacityConfigControl } from "../../controls/OpacityConfigControl/useOpacityConfigControl";
import {
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";
import { useVisibilityConfigControl } from "../../controls/VisibilityConfigControl/useVisibilityConfigControl";
import { cells, renderers } from "../../jsonforms";

const ConfigControl = {
  labelColor: "labelColor",
  labelVisibility: "labelVisibility",
  labelOpacity: "labelOpacity",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export type LabelsPanelItemSettingsProps = {
  labels: Labels;
};

export function LabelsPanelItemSettings({
  labels,
}: LabelsPanelItemSettingsProps) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const labelsDataLoaderRegistry = useTissUUmaps(
    (state) => state.labelsDataLoaderRegistry,
  );
  const updateLabels = useTissUUmaps((state) => state.updateLabels);

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = labelsDataLoaderRegistry.get(labels.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No labels data loader registered for data source type "${labels.dataSource.type}"`,
      );
    }
    return value;
  }, [labelsDataLoaderRegistry, labels.dataSource.type]);

  const labelColorConfigControlState = useColorConfigControl(
    labels.labelColor,
    (newColorConfig) => updateLabels(labels.id, { labelColor: newColorConfig }),
    defaultLabelColor,
  );
  const labelVisibilityConfigControlState = useVisibilityConfigControl(
    labels.labelVisibility,
    (newVisibilityConfig) =>
      updateLabels(labels.id, { labelVisibility: newVisibilityConfig }),
    defaultLabelVisibility,
  );
  const labelOpacityConfigControlState = useOpacityConfigControl(
    labels.labelOpacity,
    (newOpacityConfig) =>
      updateLabels(labels.id, { labelOpacity: newOpacityConfig }),
    defaultLabelOpacity,
  );

  return (
    <div>
      {/* Data source */}
      <JsonForms
        schema={dataSourceSchema}
        uischema={dataSourceUISchema}
        data={labels.dataSource}
        onChange={({ data, errors }) => {
          if (errors === undefined || errors.length === 0) {
            updateLabels(labels.id, {
              dataSource: {
                ...labels.dataSource,
                ...(data as LabelsDataSource),
              },
            });
          }
        }}
        renderers={renderers}
        cells={cells}
      />
      {/* Label settings */}
      <Accordion
        value={[expandedConfigControl]}
        onValueChange={(value) =>
          setExpandedConfigControl(
            (value[0] as ConfigControl | undefined) ?? null,
          )
        }
      >
        {/* Label color */}
        <AccordionItem value={ConfigControl.labelColor}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Color</AccordionTrigger>
            <ColorConfigSourceToggleGroup
              state={labelColorConfigControlState}
              className="ml-auto"
              onClick={() => setExpandedConfigControl(ConfigControl.labelColor)}
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl state={labelColorConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
        {/* Label visibility */}
        <AccordionItem value={ConfigControl.labelVisibility}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              state={labelVisibilityConfigControlState}
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.labelVisibility)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigControl
              state={labelVisibilityConfigControlState}
            />
          </AccordionPanel>
        </AccordionItem>
        {/* Label opacity */}
        <AccordionItem value={ConfigControl.labelOpacity}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              state={labelOpacityConfigControlState}
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.labelOpacity)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <OpacityConfigControl state={labelOpacityConfigControlState} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
