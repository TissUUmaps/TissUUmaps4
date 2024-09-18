import OpenSeadragon from "openseadragon";

import Layer from "../model/layer";

export type ViewerState = {
  layers: {
    [layerId: string]: {
      dummyTiledImageIndex: number;
      dirty: boolean;
      images: {
        [imageId: string]: { tiledImageIndex: number; dirty: boolean };
      };
    };
  };
};

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLDivElement): OpenSeadragon.Viewer {
    return new OpenSeadragon.Viewer({
      element: viewerElement,
      // TODO OpenSeadragon viewer options
    });
  }

  static updateViewer(
    viewer: OpenSeadragon.Viewer,
    viewerState: ViewerState,
    layers: { [layerId: string]: Layer },
  ): ViewerState {
    for (const layerId of Object.keys(viewerState.layers)) {
      for (const imageId of Object.keys(viewerState.layers[layerId].images)) {
        if (
          !(layerId in layers) ||
          viewerState.layers[layerId].dirty ||
          !(imageId in layers[layerId].images) ||
          viewerState.layers[layerId].images[imageId].dirty
        ) {
          // TODO delete image TiledImage
          delete viewerState.layers[layerId].images[imageId];
        }
      }
      if (!(layerId in layers) || viewerState.layers[layerId].dirty) {
        // TODO delete dummy TiledImage
        delete viewerState.layers[layerId];
      }
    }
    for (const layerId of Object.keys(layers)) {
      if (!(layerId in viewerState.layers)) {
        const dummyTiledImageIndex = -1; // TODO create dummy TiledImage
        viewerState.layers[layerId] = {
          dummyTiledImageIndex: dummyTiledImageIndex,
          dirty: false,
          images: {},
        };
      }
      for (const imageId of Object.keys(layers[layerId].images)) {
        if (!(imageId in viewerState.layers[layerId].images)) {
          const tiledImageIndex = -1; // TODO create image TiledImage
          viewerState.layers[layerId].images[imageId] = {
            tiledImageIndex: tiledImageIndex,
            dirty: false,
          };
        }
      }
    }
    return viewerState;
  }

  static destroyViewer(viewer: OpenSeadragon.Viewer): void {
    viewer.destroy();
  }
}
