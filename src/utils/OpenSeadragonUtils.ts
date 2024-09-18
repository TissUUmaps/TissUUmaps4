import OpenSeadragon from "openseadragon";

import Layer from "../model/layer";

export type ViewerState = {
  [layerId: string]: {
    dummyTiledImageIndex: number;
    dirty: boolean;
    images: {
      [imageId: string]: { tiledImageIndex: number; dirty: boolean };
    };
  };
};

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLDivElement): OpenSeadragon.Viewer {
    return new OpenSeadragon.Viewer({
      element: viewerElement,
      // TODO OpenSeadragon options
    });
  }

  static updateViewer(
    viewer: OpenSeadragon.Viewer,
    viewerState: ViewerState,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    layers: { [layerId: string]: Layer },
  ): ViewerState {
    // TODO update viewer according to the desired viewerState
    return viewerState;
  }

  static destroyViewer(viewer: OpenSeadragon.Viewer): void {
    viewer.destroy();
  }
}
