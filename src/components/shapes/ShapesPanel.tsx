import { Shapes } from "../../model/shapes";
import ShapesGroupSettingsPanel from "./ShapesGroupSettingsPanel";
import ShapesSettingsPanel from "./ShapesSettingsPanel";

type ShapesPanelProps = {
  shapesId: string;
  shapes: Shapes;
};

export default function ShapesPanel(props: ShapesPanelProps) {
  return (
    <>
      <ShapesSettingsPanel shapesId={props.shapesId} shapes={props.shapes} />
      <ShapesGroupSettingsPanel
        shapesId={props.shapesId}
        shapes={props.shapes}
      />
    </>
  );
}
