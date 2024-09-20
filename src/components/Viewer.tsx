import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

type TiledImageInfo = {
  layerId: string;
  imageId: string;
};

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  tiledImageInfos: TiledImageInfo[];
};

export default function Viewer() {
  const viewerState = useRef<ViewerState | null>(null);

  const layers = useSharedStore((state) => state.layers);
  const getImageProvider = useSharedStore((state) => state.getImageProvider);

  // callback refs are always called before useEffect
  const setViewerState = useCallback((viewerElement: HTMLDivElement | null) => {
    if (viewerState.current) {
      OpenSeadragonUtils.destroyViewer(viewerState.current.viewer);
      viewerState.current = null;
    }
    if (viewerElement) {
      viewerState.current = {
        viewer: OpenSeadragonUtils.createViewer(viewerElement),
        tiledImageInfos: [],
      };
    }
  }, []);

  useEffect(() => {
    if (viewerState.current) {
      const oldTiledImageInfos: TiledImageInfo[] = [];
      for (const oldTiledImageInfo of viewerState.current.tiledImageInfos) {
        const layer = layers.get(oldTiledImageInfo.layerId);
        const image = layer?.images.get(oldTiledImageInfo.imageId);
        if (layer && image) {
          oldTiledImageInfos.push(oldTiledImageInfo);
        } else {
          OpenSeadragonUtils.deleteTiledImage(
            viewerState.current.viewer,
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
                viewerState.current.viewer,
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
                viewerState.current.viewer,
                oldTiledImageIndex,
                newTiledImageInfos.length,
              );
            }
            OpenSeadragonUtils.updateTiledImage(
              viewerState.current.viewer,
              newTiledImageInfos.length,
              layer,
              image,
            );
            newTiledImageInfos.push(tiledImageInfo);
          }
        }
      }
      viewerState.current.tiledImageInfos = newTiledImageInfos;
    }
  }, [layers, getImageProvider]);

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

  return <div ref={setViewerState} id="viewer" className="h-100" />;
}
