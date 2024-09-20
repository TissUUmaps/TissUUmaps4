import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef, useState } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

type TiledImageInfo = {
  layerId: string;
  imageId: string;
};

type ViewerState = {
  tiledImageInfos: TiledImageInfo[];
};

export default function Viewer() {
  const layers = useSharedStore((state) => state.layers);
  const cleanImages = useSharedStore((state) => state.cleanImages);

  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>({
    tiledImageInfos: [],
  });

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
      // delete old TiledImage instances
      const oldTiledImageInfos: TiledImageInfo[] = [];
      for (const oldTiledImageInfo of viewerState.tiledImageInfos) {
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
      // create, move and/or update TiledImage instances
      const tiledImageInfos: TiledImageInfo[] = [];
      for (const [layerId, layer] of layers) {
        for (const [imageId, image] of layer.images) {
          const oldTiledImageIndex = oldTiledImageInfos.findIndex(
            (oldTiledImageInfo) =>
              oldTiledImageInfo.layerId === layerId &&
              oldTiledImageInfo.imageId === imageId,
          );
          let tiledImageInfo: TiledImageInfo;
          if (oldTiledImageIndex === -1) {
            OpenSeadragonUtils.createTiledImage(
              viewerRef.current,
              tiledImageInfos.length,
              "", // TODO load image
            );
            tiledImageInfo = { layerId: layerId, imageId: imageId };
          } else {
            tiledImageInfo = oldTiledImageInfos.at(oldTiledImageIndex)!;
            if (oldTiledImageIndex !== tiledImageInfos.length) {
              OpenSeadragonUtils.moveTiledImage(
                viewerRef.current,
                oldTiledImageIndex,
                tiledImageInfos.length,
              );
            }
            if (image.reload) {
              OpenSeadragonUtils.createTiledImage(
                viewerRef.current,
                tiledImageInfos.length,
                "", // TODO load image
                true,
              );
            } else if (image.update) {
              OpenSeadragonUtils.updateTiledImage(
                viewerRef.current,
                tiledImageInfos.length,
              );
            }
          }
          tiledImageInfos.push(tiledImageInfo);
        }
      }
      setViewerState({ tiledImageInfos: tiledImageInfos });
      cleanImages();
    }
  }, [layers, viewerState, setViewerState, cleanImages]);

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
