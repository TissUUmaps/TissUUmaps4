import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

type TiledImageState = {
  layerId: string;
  imageId: string;
  preLoadIndex: number;
  postLoadIndex: number;
  postLoadUpdate?: boolean;
  loaded: boolean;
};

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  tiledImageStates: TiledImageState[];
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
        tiledImageStates: [],
      };
    }
  }, []);

  // refresh the OpenSeadragon viewer upon image/layer changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      // delete old TiledImage instances
      const oldTiledImageStates: TiledImageState[] = [];
      for (const oldTiledImageState of viewerState.tiledImageStates) {
        const layer = layers.get(oldTiledImageState.layerId);
        const image = layer?.images.get(oldTiledImageState.imageId);
        if (layer && image) {
          oldTiledImageStates.push(oldTiledImageState);
        } else {
          OpenSeadragonUtils.deleteTiledImage(
            viewerState.viewer,
            oldTiledImageStates.length,
          );
        }
      }
      // create/update TiledImage instances
      const newTiledImageStates: TiledImageState[] = [];
      for (const [layerId, layer] of layers) {
        for (const [imageId, image] of layer.images) {
          const oldTiledImageIndex = oldTiledImageStates.findIndex(
            (oldTiledImageState) =>
              oldTiledImageState.layerId === layerId &&
              oldTiledImageState.imageId === imageId,
          );
          if (oldTiledImageIndex === -1) {
            // create new TiledImage instance
            const imageReader = createImageReader(image.data);
            if (imageReader) {
              const newTiledImageState: TiledImageState = {
                layerId: layerId,
                imageId: imageId,
                preLoadIndex: newTiledImageStates.length,
                postLoadIndex: newTiledImageStates.length,
                loaded: false,
              };
              OpenSeadragonUtils.createTiledImage(
                viewerState.viewer,
                newTiledImageStates.length,
                layer,
                image,
                imageReader.getTileSource(),
                () => {
                  // if necessary, move new TiledImage instance
                  if (
                    newTiledImageState.preLoadIndex !==
                    newTiledImageState.postLoadIndex
                  ) {
                    OpenSeadragonUtils.moveTiledImage(
                      viewerState.viewer,
                      newTiledImageState.preLoadIndex,
                      newTiledImageState.postLoadIndex,
                    );
                  }
                  // if necessary, update new TiledImage instance
                  if (newTiledImageState.postLoadUpdate) {
                    OpenSeadragonUtils.updateTiledImage(
                      viewerState.viewer,
                      newTiledImageState.postLoadIndex,
                      layer,
                      image,
                    );
                  }
                  newTiledImageState.loaded = true;
                },
              );
              newTiledImageStates.push(newTiledImageState);
            } else {
              console.warn(`Unsupported image data type: ${image.data.type}`);
            }
          } else {
            const oldTiledImageState = oldTiledImageStates[oldTiledImageIndex];
            // if necessary, move existing TiledImage instance
            if (oldTiledImageIndex !== newTiledImageStates.length) {
              if (oldTiledImageState.loaded) {
                OpenSeadragonUtils.moveTiledImage(
                  viewerState.viewer,
                  oldTiledImageIndex,
                  newTiledImageStates.length,
                );
              } else {
                // delay move until TiledImage has been loaded
                oldTiledImageState.postLoadIndex = newTiledImageStates.length;
              }
            }
            // update existing TiledImage instance
            if (oldTiledImageState.loaded) {
              OpenSeadragonUtils.updateTiledImage(
                viewerState.viewer,
                newTiledImageStates.length,
                layer,
                image,
              );
            } else {
              // delay update until TiledImage has been loaded
              oldTiledImageState.postLoadUpdate = true;
            }
            newTiledImageStates.push(oldTiledImageState);
          }
        }
      }
      viewerState.tiledImageStates = newTiledImageStates;
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
