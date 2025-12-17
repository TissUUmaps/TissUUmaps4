import { useTissUUmaps } from "../../store";
import { MapUtils } from "../../utils";
import { ImagePanel } from "./ImagePanel";

export function ImageCollectionPanel() {
  const imageMap = useTissUUmaps((state) => state.imageMap);
  return (
    <>
      {imageMap &&
        MapUtils.map(imageMap, (imageId, image) => (
          <ImagePanel key={imageId} imageId={imageId} image={image} />
        ))}
    </>
  );
}
