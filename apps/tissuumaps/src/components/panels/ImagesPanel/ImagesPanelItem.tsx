import { type Image } from "@tissuumaps/core";

import { ImagesPanelItemSettings } from "./ImagesPanelItemSettings";

export type ImagesPanelItemProps = {
  image: Image;
};

export function ImagesPanelItem({ image }: ImagesPanelItemProps) {
  return (
    <>
      <ImagesPanelItemSettings image={image} />
    </>
  );
}
