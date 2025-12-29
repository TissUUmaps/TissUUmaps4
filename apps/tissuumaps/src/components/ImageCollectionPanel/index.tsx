import { useTissUUmaps } from "../../store";
import { ImagePanel } from "./ImagePanel";

export function ImageCollectionPanel() {
  const images = useTissUUmaps((state) => state.images);
  return (
    <>
      {images.map((image) => (
        <ImagePanel key={image.id} image={image} />
      ))}
    </>
  );
}
