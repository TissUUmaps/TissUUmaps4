import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef, useState } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

type TiledImageInfo = {
  layerId: string;
  imageId: string;
};

export default function Viewer() {
  const layers = useSharedStore((state) => state.layers);
  const getImageProvider = useSharedStore((state) => state.getImageProvider);

  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [tiledImageInfos, setTiledImageInfos] = useState<TiledImageInfo[]>([]);

  // callback refs are always called before useEffect
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    if (viewerRef.current) {
      OpenSeadragonUtils.destroyViewer(viewerRef.current);
      viewerRef.current = null;
    }
    if (viewerElement) {
      viewerRef.current = OpenSeadragonUtils.createViewer(viewerElement);
    }
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      const oldTiledImageInfos: TiledImageInfo[] = [];
      for (const oldTiledImageInfo of tiledImageInfos) {
        const layer = layers.get(oldTiledImageInfo.layerId);
        const image = layer?.images.get(oldTiledImageInfo.imageId);
        if (layer && image) {
          oldTiledImageInfos.push(oldTiledImageInfo);
        } else {
          OpenSeadragonUtils.deleteTiledImage(
            viewerRef.current,
            oldTiledImageInfos.length,
          );
        }
      }
      const newTiledImageInfos: TiledImageInfo[] = [];
      for (const [layerId, layer] of layers) {
        for (const [imageId, image] of layer.images) {
          const oldTiledImageIndex = oldTiledImageInfos.findIndex(
            (oldTiledImageInfo) =>
              oldTiledImageInfo.layerId === layerId &&
              oldTiledImageInfo.imageId === imageId,
          );
          if (oldTiledImageIndex === -1) {
            const imageProvider = getImageProvider(
              image.data.type,
              image.data.options,
            );
            if (imageProvider) {
              OpenSeadragonUtils.createTiledImage(
                viewerRef.current,
                newTiledImageInfos.length,
                layer,
                image,
                imageProvider.getData(),
              );
              newTiledImageInfos.push({ layerId: layerId, imageId: imageId });
            }
          } else {
            const tiledImageInfo = oldTiledImageInfos.at(oldTiledImageIndex)!;
            if (oldTiledImageIndex !== newTiledImageInfos.length) {
              OpenSeadragonUtils.moveTiledImage(
                viewerRef.current,
                oldTiledImageIndex,
                newTiledImageInfos.length,
              );
            }
            OpenSeadragonUtils.updateTiledImage(
              viewerRef.current,
              newTiledImageInfos.length,
              layer,
              image,
            );
            newTiledImageInfos.push(tiledImageInfo);
          }
        }
      }
      setTiledImageInfos(newTiledImageInfos);
    }
  }, [layers, tiledImageInfos, setTiledImageInfos, getImageProvider]);

  // TODO global marker size slider
  // <div id="ISS_globalmarkersize" className="d-none px-1 mx-1 viewer-layer">
  //   <label className="form-label" htmlFor="ISS_globalmarkersize_text">
  //     Marker size:
  //     <em className="form-label" id="ISS_globalmarkersize_label">
  //       100
  //     </em>
  //   </label>
  //   <br />
  //   <input
  //     className="form-range"
  //     type="range"
  //     id="ISS_globalmarkersize_text"
  //     defaultValue="100"
  //     min="0"
  //     max="500"
  //     step="10"
  //     oninput="document.getElementById('ISS_globalmarkersize_label').innerHTML = this.value;"
  //   />
  // </div>

  return <div ref={setViewerRef} id="viewer" />; // className="h-100"
}
