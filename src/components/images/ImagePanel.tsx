import { Image } from "../../models/image";
import ImageSettingsPanel from "./ImageSettingsPanel";

type ImagePanelProps = {
  imageId: string;
  image: Image;
};

export default function ImagePanel(props: ImagePanelProps) {
  return (
    <>
      <ImageSettingsPanel imageId={props.imageId} image={props.image} />
    </>
  );
}
