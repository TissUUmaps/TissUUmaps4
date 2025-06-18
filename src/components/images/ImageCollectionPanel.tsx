import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import ImagePanel from "./ImagePanel";

export default function ImageCollectionPanel() {
  const images = useBoundStore((state) => state.images);
  return (
    <>
      {images &&
        MapUtils.map(images, (imageId, image) => (
          <ImagePanel key={imageId} imageId={imageId} image={image} />
        ))}
    </>
  );
}
