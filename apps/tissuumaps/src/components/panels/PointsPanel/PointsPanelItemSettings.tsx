import { type Points, defaultPointColor } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AccordionTriggerRightIcon,
} from "../../common/accordion";
import {
  ColorConfigContextProvider,
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "../../controls/ColorConfigControl";

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <Accordion>
      {/* Point color */}
      <ColorConfigContextProvider
        colorConfig={points.pointColor}
        onColorConfigChange={(c) => updatePoints(points.id, { pointColor: c })}
        defaultColorConfigSource="value"
      >
        <AccordionItem>
          <AccordionHeader>
            <AccordionTriggerRightIcon />
            <AccordionTrigger>Color</AccordionTrigger>
            <ColorConfigSourceToggleGroup className="ml-auto" />
          </AccordionHeader>
          <AccordionPanel>
            <ColorConfigControl defaultValue={defaultPointColor} />
          </AccordionPanel>
        </AccordionItem>
      </ColorConfigContextProvider>
    </Accordion>
  );
}
