import {
  MarkerConfigContextProvider,
  MarkerConfigControl,
  MarkerConfigSourceToggleGroup,
} from "@/components/controls/MarkerConfigControl";
import { useState } from "react";

import {
  type Points,
  defaultPointColor,
  defaultPointMarker,
  defaultPointSize,
  defaultPointSizeUnit,
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
  pointMarker: "pointMarker",
  pointSize: "pointSize",
  pointColor: "pointColor",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <Accordion
      value={[expandedConfigControl]}
      onValueChange={(value) =>
        setExpandedConfigControl(
          (value[0] as ConfigControl | undefined) ?? null,
        )
      }
    >
      {/* Point marker */}
      <MarkerConfigContextProvider
        markerConfig={points.pointMarker}
        onMarkerConfigChange={(newMarkerConfig) =>
          updatePoints(points.id, { pointMarker: newMarkerConfig })
        }
        defaultMarker={defaultPointMarker}
      >
        <AccordionItem value={ConfigControl.pointMarker}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Marker</AccordionTrigger>
            <MarkerConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.pointMarker)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <MarkerConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </MarkerConfigContextProvider>
      {/* Point size */}
      <SizeConfigContextProvider
        sizeConfig={points.pointSize}
        onSizeConfigChange={(newSizeConfig) =>
          updatePoints(points.id, { pointSize: newSizeConfig })
        }
        defaultSize={defaultPointSize}
        defaultSizeUnit={defaultPointSizeUnit}
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
    </Accordion>
  );
}
