import useOpenSeadragon from "./useOpenSeadragon";
import useWebGL from "./useWebGL";

export default function Viewer() {
  const os = useOpenSeadragon();
  useWebGL(os.viewerCanvas, os.containerSize, os.viewportBounds);
  return <div ref={os.ref} className="size-full bg-white" />;
}
