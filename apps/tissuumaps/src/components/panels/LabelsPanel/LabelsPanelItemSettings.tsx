import { useState } from "react";

import {
  type Labels,
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
  ColorConfigContextProvider,
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";
import {
  OpacityConfigContextProvider,
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "../../controls/OpacityConfigControl";
import {
  VisibilityConfigContextProvider,
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "../../controls/VisibilityConfigControl";

const ConfigControl = {
  labelColor: "labelColor",
  labelVisibility: "labelVisibility",
  labelOpacity: "labelOpacity",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export function LabelsPanelItemSettings({ labels }: { labels: Labels }) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const updateLabels = useTissUUmaps((state) => state.updateLabels);

  return (
    <Accordion
      value={[expandedConfigControl]}
      onValueChange={(value) =>
        setExpandedConfigControl(
          (value[0] as ConfigControl | undefined) ?? null,
        )
      }
    >
      {/* Label color */}
      <ColorConfigContextProvider
        colorConfig={labels.labelColor}
        onColorConfigChange={(newColorConfig) =>
          updateLabels(labels.id, { labelColor: newColorConfig })
        }
        defaultColor={defaultLabelColor}
      >
        <AccordionItem value={ConfigControl.labelColor}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Color</AccordionTrigger>
            <ColorConfigSourceToggleGroup
              className="ml-auto"
              onClick={() => setExpandedConfigControl(ConfigControl.labelColor)}
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </ColorConfigContextProvider>
      {/* Label visibility */}
      <VisibilityConfigContextProvider
        visibilityConfig={labels.labelVisibility}
        onVisibilityConfigChange={(newVisibilityConfig) =>
          updateLabels(labels.id, { labelVisibility: newVisibilityConfig })
        }
        defaultVisibility={defaultLabelVisibility}
      >
        <AccordionItem value={ConfigControl.labelVisibility}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.labelVisibility)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </VisibilityConfigContextProvider>
      {/* Label opacity */}
      <OpacityConfigContextProvider
        opacityConfig={labels.labelOpacity}
        onOpacityConfigChange={(newOpacityConfig) =>
          updateLabels(labels.id, { labelOpacity: newOpacityConfig })
        }
        defaultOpacity={defaultLabelOpacity}
      >
        <AccordionItem value={ConfigControl.labelOpacity}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.labelOpacity)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <OpacityConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </OpacityConfigContextProvider>
    </Accordion>
  );
}
