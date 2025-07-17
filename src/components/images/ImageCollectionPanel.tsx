import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import ImagePanel from "./ImagePanel";

export default function ImageCollectionPanel() {
  const imageMap = useBoundStore((state) => state.imageMap);
  return (
    <>
      {imageMap &&
        MapUtils.map(imageMap, (imageId, image) => (
          <ImagePanel key={imageId} imageId={imageId} image={image} />
        ))}
    </>
  );
}
