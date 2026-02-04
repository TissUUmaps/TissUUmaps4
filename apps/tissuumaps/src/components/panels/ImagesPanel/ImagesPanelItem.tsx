import { type Image } from "@tissuumaps/core";

import { ImagesPanelItemSettings } from "./ImagesPanelItemSettings";

export function ImagesPanelItem({ image }: { image: Image }) {
  return (
    <>
      <ImagesPanelItemSettings image={image} />
    </>
  );
}
