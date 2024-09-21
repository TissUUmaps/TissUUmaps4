import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

type TiledImageSource = {
  layerId: string;
  imageId: string;
  preLoadIndex: number;
  postLoadIndex: number;
  postLoadUpdate?: boolean;
  loaded: boolean;
};

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  tiledImageSources: TiledImageSource[];
};

export default function Viewer() {
  const viewerStateRef = useRef<ViewerState | null>(null);
  const layers = useSharedStore((state) => state.layers);
  const createImageReader = useSharedStore((state) => state.createImageReader);

  // use a ref callback for instantiating the OpenSeadragon viewer
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerState = useCallback((viewerElement: HTMLDivElement | null) => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      OpenSeadragonUtils.destroyViewer(viewerState.viewer);
      viewerStateRef.current = null;
    }
    if (viewerElement) {
      viewerStateRef.current = {
        viewer: OpenSeadragonUtils.createViewer(viewerElement),
        tiledImageSources: [],
      };
    }
  }, []);

  // update the OpenSeadragon viewer upon image/layer changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      // delete old TiledImage instances
      const oldTiledImageSources: TiledImageSource[] = [];
      for (const oldTiledImageSource of viewerState.tiledImageSources) {
        const layer = layers.get(oldTiledImageSource.layerId);
        const image = layer?.images.get(oldTiledImageSource.imageId);
        if (layer && image) {
          oldTiledImageSources.push(oldTiledImageSource);
        } else {
          OpenSeadragonUtils.deleteTiledImage(
            viewerState.viewer,
            oldTiledImageSources.length,
          );
        }
      }
      // create/update TiledImage instances
      const newTiledImageSources: TiledImageSource[] = [];
      for (const [layerId, layer] of layers) {
        for (const [imageId, image] of layer.images) {
          const oldTiledImageIndex = oldTiledImageSources.findIndex(
            (oldTiledImageSource) =>
              oldTiledImageSource.layerId === layerId &&
              oldTiledImageSource.imageId === imageId,
          );
          if (oldTiledImageIndex === -1) {
            // create new TiledImage instance
            const imageReader = createImageReader(image.data);
            if (imageReader) {
              const newTiledImageSource: TiledImageSource = {
                layerId: layerId,
                imageId: imageId,
                preLoadIndex: newTiledImageSources.length,
                postLoadIndex: newTiledImageSources.length,
                loaded: false,
              };
              OpenSeadragonUtils.createTiledImage(
                viewerState.viewer,
                newTiledImageSources.length,
                layer,
                image,
                imageReader.getTileSource(),
                () => {
                  if (
                    newTiledImageSource.preLoadIndex !==
                    newTiledImageSource.postLoadIndex
                  ) {
                    OpenSeadragonUtils.moveTiledImage(
                      viewerState.viewer,
                      newTiledImageSource.preLoadIndex,
                      newTiledImageSource.postLoadIndex,
                    );
                  }
                  if (newTiledImageSource.postLoadUpdate) {
                    OpenSeadragonUtils.updateTiledImage(
                      viewerState.viewer,
                      newTiledImageSource.postLoadIndex,
                      layer,
                      image,
                    );
                  }
                  newTiledImageSource.loaded = true;
                },
              );
              newTiledImageSources.push(newTiledImageSource);
            } else {
              console.warn(`Unsupported image data type: ${image.data.type}`);
            }
          } else {
            // update existing TiledImage instance
            const oldTiledImageSource =
              oldTiledImageSources[oldTiledImageIndex];
            if (oldTiledImageIndex !== newTiledImageSources.length) {
              if (oldTiledImageSource.loaded) {
                OpenSeadragonUtils.moveTiledImage(
                  viewerState.viewer,
                  oldTiledImageIndex,
                  newTiledImageSources.length,
                );
              } else {
                oldTiledImageSource.postLoadIndex = newTiledImageSources.length;
              }
            }
            if (oldTiledImageSource.loaded) {
              OpenSeadragonUtils.updateTiledImage(
                viewerState.viewer,
                newTiledImageSources.length,
                layer,
                image,
              );
            } else {
              oldTiledImageSource.postLoadUpdate = true;
            }
            newTiledImageSources.push(oldTiledImageSource);
          }
        }
      }
      viewerState.tiledImageSources = newTiledImageSources;
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
