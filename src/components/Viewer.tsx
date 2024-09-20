import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

type TiledImageSource = {
  layerId: string;
  imageId: string;
};

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  tiledImageSources: TiledImageSource[];
};

export default function Viewer() {
  const viewerState = useRef<ViewerState | null>(null);
  const layers = useSharedStore((state) => state.layers);
  const createImageReader = useSharedStore((state) => state.createImageReader);

  // use a ref callback for instantiating the OpenSeadragon viewer
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerState = useCallback((viewerElement: HTMLDivElement | null) => {
    if (viewerState.current) {
      OpenSeadragonUtils.destroyViewer(viewerState.current.viewer);
      viewerState.current = null;
    }
    if (viewerElement) {
      viewerState.current = {
        viewer: OpenSeadragonUtils.createViewer(viewerElement),
        tiledImageSources: [],
      };
    }
  }, []);

  // update the OpenSeadragon viewer upon image/layer changes
  // note: ref callbacks are executed before useEffect hooks
  useEffect(() => {
    if (viewerState.current) {
      // delete old TiledImage instances
      const oldTiledImageSources: TiledImageSource[] = [];
      for (const oldTiledImageSource of viewerState.current.tiledImageSources) {
        const layer = layers.get(oldTiledImageSource.layerId);
        const image = layer?.images.get(oldTiledImageSource.imageId);
        if (layer && image) {
          oldTiledImageSources.push(oldTiledImageSource);
        } else {
          OpenSeadragonUtils.deleteTiledImage(
            viewerState.current.viewer,
            oldTiledImageSources.length,
          );
        }
      }
      // create/update TiledImage instances
      const tiledImageSources: TiledImageSource[] = [];
      for (const [layerId, layer] of layers) {
        for (const [imageId, image] of layer.images) {
          const oldTiledImageIndex = oldTiledImageSources.findIndex(
            (oldTiledImageSource) =>
              oldTiledImageSource.layerId === layerId &&
              oldTiledImageSource.imageId === imageId,
          );
          if (oldTiledImageIndex === -1) {
            // create new TiledImage instance
            const imageReader = createImageReader(
              image.data.type,
              image.data.options,
            );
            if (imageReader) {
              OpenSeadragonUtils.createTiledImage(
                viewerState.current.viewer,
                tiledImageSources.length,
                layer,
                image,
                imageReader.getWidth(),
                imageReader.getTileSource(),
              );
              tiledImageSources.push({ layerId: layerId, imageId: imageId });
            } else {
              console.warn(`Image reader not found: ${image.data.type}`);
            }
          } else {
            // update existing TiledImage instance
            const tiledImageSource = oldTiledImageSources[oldTiledImageIndex];
            if (oldTiledImageIndex !== tiledImageSources.length) {
              OpenSeadragonUtils.moveTiledImage(
                viewerState.current.viewer,
                oldTiledImageIndex,
                tiledImageSources.length,
              );
            }
            OpenSeadragonUtils.updateTiledImage(
              viewerState.current.viewer,
              tiledImageSources.length,
              layer,
              image,
            );
            tiledImageSources.push(tiledImageSource);
          }
        }
      }
      viewerState.current.tiledImageSources = tiledImageSources;
    }
  }, [layers, createImageReader]);

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
