import { useState } from "react";

import {
  type Shapes,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
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
  shapeFillColor: "shapeFillColor",
  shapeFillVisibility: "shapeFillVisibility",
  shapeFillOpacity: "shapeFillOpacity",
  shapeStrokeColor: "shapeStrokeColor",
  shapeStrokeVisibility: "shapeStrokeVisibility",
  shapeStrokeOpacity: "shapeStrokeOpacity",
} as const;

type ConfigControl = (typeof ConfigControl)[keyof typeof ConfigControl];

export function ShapesPanelItemSettings({ shapes }: { shapes: Shapes }) {
  const [expandedConfigControl, setExpandedConfigControl] =
    useState<ConfigControl | null>(null);

  const updateShapes = useTissUUmaps((state) => state.updateShapes);

  return (
    <Accordion
      value={[expandedConfigControl]}
      onValueChange={(value) =>
        setExpandedConfigControl(
          (value[0] as ConfigControl | undefined) ?? null,
        )
      }
    >
      {/* Shape fill color */}
      <ColorConfigContextProvider
        colorConfig={shapes.shapeFillColor}
        onColorConfigChange={(newColorConfig) =>
          updateShapes(shapes.id, { shapeFillColor: newColorConfig })
        }
        defaultColor={defaultShapeFillColor}
      >
        <AccordionItem value={ConfigControl.shapeFillColor}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill color</AccordionTrigger>
            <ColorConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.shapeFillColor)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </ColorConfigContextProvider>
      {/* Shape fill visibility */}
      <VisibilityConfigContextProvider
        visibilityConfig={shapes.shapeFillVisibility}
        onVisibilityConfigChange={(newVisibilityConfig) =>
          updateShapes(shapes.id, { shapeFillVisibility: newVisibilityConfig })
        }
        defaultVisibility={defaultShapeFillVisibility}
      >
        <AccordionItem value={ConfigControl.shapeFillVisibility}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.shapeFillVisibility)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </VisibilityConfigContextProvider>
      {/* Shape fill opacity */}
      <OpacityConfigContextProvider
        opacityConfig={shapes.shapeFillOpacity}
        onOpacityConfigChange={(newOpacityConfig) =>
          updateShapes(shapes.id, { shapeFillOpacity: newOpacityConfig })
        }
        defaultOpacity={defaultShapeFillOpacity}
      >
        <AccordionItem value={ConfigControl.shapeFillOpacity}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Fill opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.shapeFillOpacity)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <OpacityConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </OpacityConfigContextProvider>
      {/* Shape stroke color */}
      <ColorConfigContextProvider
        colorConfig={shapes.shapeStrokeColor}
        onColorConfigChange={(newColorConfig) =>
          updateShapes(shapes.id, { shapeStrokeColor: newColorConfig })
        }
        defaultColor={defaultShapeStrokeColor}
      >
        <AccordionItem value={ConfigControl.shapeStrokeColor}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke color</AccordionTrigger>
            <ColorConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.shapeStrokeColor)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </ColorConfigContextProvider>
      {/* Shape stroke visibility */}
      <VisibilityConfigContextProvider
        visibilityConfig={shapes.shapeStrokeVisibility}
        onVisibilityConfigChange={(newVisibilityConfig) =>
          updateShapes(shapes.id, {
            shapeStrokeVisibility: newVisibilityConfig,
          })
        }
        defaultVisibility={defaultShapeStrokeVisibility}
      >
        <AccordionItem value={ConfigControl.shapeStrokeVisibility}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke visibility</AccordionTrigger>
            <VisibilityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.shapeStrokeVisibility)
              }
            />
          </AccordionHeader>
          <AccordionPanel>
            <VisibilityConfigControl />
          </AccordionPanel>
        </AccordionItem>
      </VisibilityConfigContextProvider>
      {/* Shape stroke opacity */}
      <OpacityConfigContextProvider
        opacityConfig={shapes.shapeStrokeOpacity}
        onOpacityConfigChange={(newOpacityConfig) =>
          updateShapes(shapes.id, { shapeStrokeOpacity: newOpacityConfig })
        }
        defaultOpacity={defaultShapeStrokeOpacity}
      >
        <AccordionItem value={ConfigControl.shapeStrokeOpacity}>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Stroke opacity</AccordionTrigger>
            <OpacityConfigSourceToggleGroup
              className="ml-auto"
              onClick={() =>
                setExpandedConfigControl(ConfigControl.shapeStrokeOpacity)
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
