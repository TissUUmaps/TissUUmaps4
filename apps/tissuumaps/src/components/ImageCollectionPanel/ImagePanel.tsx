import { type Image } from "@tissuumaps/core";

import { ImageSettingsPanel } from "./ImageSettingsPanel";

type ImagePanelProps = {
  imageId: string;
  image: Image;
};

export function ImagePanel(props: ImagePanelProps) {
  return (
    <>
      <ImageSettingsPanel imageId={props.imageId} image={props.image} />
    </>
  );
}
