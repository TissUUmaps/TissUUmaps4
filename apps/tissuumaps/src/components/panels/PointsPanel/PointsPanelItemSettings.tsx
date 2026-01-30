import { useState } from "react";

import {
  type Points,
  defaultPointColor,
  defaultPointSize,
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
  SizeConfigContextProvider,
  SizeConfigControl,
  SizeConfigSourceToggleGroup,
} from "../../controls/SizeConfigControl";

const ConfigControl = {
  pointColor: "pointColor",
  pointSize: "pointSize",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <Accordion
      value={[expandedConfigControl]}
      onValueChange={(value) => {
        if (value.length === 1) {
          setExpandedConfigControl(value[0] as ConfigControl | null);
        }
      }}
    >
      {/* Point color */}
      <ColorConfigContextProvider
        colorConfig={points.pointColor}
        onColorConfigChange={(newColorConfig) =>
          updatePoints(points.id, { pointColor: newColorConfig })
        }
        defaultColor={defaultPointColor}
      >
        <AccordionItem value={ConfigControl.pointColor}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Color</AccordionTrigger>
            <ColorConfigSourceToggleGroup
              className="ml-auto"
              onClick={() => setExpandedConfigControl(ConfigControl.pointColor)}
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </ColorConfigContextProvider>
      {/* Point size */}
      <SizeConfigContextProvider
        sizeConfig={points.pointSize}
        onSizeConfigChange={(newSizeConfig: typeof points.pointSize) =>
          updatePoints(points.id, { pointSize: newSizeConfig })
        }
        defaultSize={defaultPointSize}
      >
        <AccordionItem value={ConfigControl.pointSize}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Size</AccordionTrigger>
            <SizeConfigSourceToggleGroup
              className="ml-auto"
              onClick={() => setExpandedConfigControl(ConfigControl.pointSize)}
            />
          </AccordionHeader>
          <AccordionPanel>
            <SizeConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </SizeConfigContextProvider>
    </Accordion>
  );
}
