import { CompleteImage } from "../../model/image";
import ImageSettingsPanel from "./ImageSettingsPanel";

type ImagePanelProps = {
  imageId: string;
  image: CompleteImage;
};

export default function ImagePanel(props: ImagePanelProps) {
  return (
    <>
      <ImageSettingsPanel imageId={props.imageId} image={props.image} />
    </>
  );
}
