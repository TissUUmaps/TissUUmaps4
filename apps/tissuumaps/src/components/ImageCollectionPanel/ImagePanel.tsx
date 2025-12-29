import { type Image } from "@tissuumaps/core";

import { ImageSettingsPanel } from "./ImageSettingsPanel";

type ImagePanelProps = {
  image: Image;
};

export function ImagePanel(props: ImagePanelProps) {
  return (
    <>
      <ImageSettingsPanel image={props.image} />
    </>
  );
}
