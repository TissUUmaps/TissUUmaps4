import {
  MarkerConfigContextProvider,
  MarkerConfigControl,
  MarkerConfigSourceToggleGroup,
} from "@/components/controls/MarkerConfigControl";
import {
  OpacityConfigContextProvider,
  OpacityConfigControl,
  OpacityConfigSourceToggleGroup,
} from "@/components/controls/OpacityConfigControl";
import {
  VisibilityConfigContextProvider,
  VisibilityConfigControl,
  VisibilityConfigSourceToggleGroup,
} from "@/components/controls/VisibilityConfigControl";
import { useState } from "react";

import {
  type Points,
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointSizeUnit,
  defaultPointVisibility,
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
  pointVisibility: "pointVisibility",
  pointOpacity: "pointOpacity",
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
      {/* Point visibility */}
      <VisibilityConfigContextProvider
        visibilityConfig={points.pointVisibility}
        onVisibilityConfigChange={(newVisibilityConfig) =>
          updatePoints(points.id, { pointVisibility: newVisibilityConfig })
        }
        defaultVisibility={defaultPointVisibility}
      >
        <AccordionItem value={ConfigControl.pointVisibility}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.pointVisibility)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </VisibilityConfigContextProvider>
      {/* Point opacity */}
      <OpacityConfigContextProvider
        opacityConfig={points.pointOpacity}
        onOpacityConfigChange={(newOpacityConfig) =>
          updatePoints(points.id, { pointOpacity: newOpacityConfig })
        }
        defaultOpacity={defaultPointOpacity}
      >
        <AccordionItem value={ConfigControl.pointOpacity}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.pointOpacity)
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
