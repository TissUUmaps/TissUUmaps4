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

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <Accordion>
      {/* Point color */}
      <ColorConfigContextProvider
        colorConfig={points.pointColor}
        onColorConfigChange={(c) => updatePoints(points.id, { pointColor: c })}
        defaultColorConfigSource="constant"
      >
        <AccordionItem>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Color</AccordionTrigger>
            <ColorConfigSourceToggleGroup className="ml-auto" />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl defaultConstantValue={defaultPointColor} />
          </AccordionPanel>
        </AccordionItem>
      </ColorConfigContextProvider>
      {/* Point size */}
      <SizeConfigContextProvider
        sizeConfig={points.pointSize}
        onSizeConfigChange={(c: typeof points.pointSize) =>
          updatePoints(points.id, { pointSize: c })
        }
        defaultSizeConfigSource="constant"
      >
        <AccordionItem>
          <AccordionHeader>
            <AccordionTriggerRightDownIcon />
            <AccordionTrigger>Size</AccordionTrigger>
            <SizeConfigSourceToggleGroup className="ml-auto" />
          </AccordionHeader>
          <AccordionPanel>
            <SizeConfigControl defaultConstantValue={defaultPointSize} />
          </AccordionPanel>
        </AccordionItem>
      </SizeConfigContextProvider>
    </Accordion>
  );
}
