import OpenSeadragon from "openseadragon";

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLDivElement): OpenSeadragon.Viewer {
    return new OpenSeadragon.Viewer({
      element: viewerElement,
      // TODO OpenSeadragon options
    });
  }

  static destroyViewer(viewer: OpenSeadragon.Viewer) {
    viewer.destroy();
  }
}
