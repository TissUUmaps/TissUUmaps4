import { CompleteShapes } from "../../model/shapes";
import ShapesGroupSettingsPanel from "./ShapesGroupSettingsPanel";
import ShapesSettingsPanel from "./ShapesSettingsPanel";

type ShapesPanelProps = {
  shapesId: string;
  shapes: CompleteShapes;
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
