import { type Shapes } from "@tissuumaps/core";

import { ShapesSettingsPanel } from "./ShapesSettingsPanel";

type ShapesPanelProps = {
  shapesId: string;
  shapes: Shapes;
};

export function ShapesPanel(props: ShapesPanelProps) {
  return (
    <>
      <ShapesSettingsPanel shapesId={props.shapesId} shapes={props.shapes} />
    </>
  );
}
