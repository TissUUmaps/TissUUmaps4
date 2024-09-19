import { Viewer } from "openseadragon";

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLElement): Viewer {
    return new Viewer({
      element: viewerElement,
      // TODO OpenSeadragon viewer options
    });
  }

  static createTiledImage(
    viewer: Viewer,
    tiledImageIndex: number,
    tileSource: string | object,
    replace?: boolean,
  ): void {
    viewer.addTiledImage({
      tileSource: tileSource,
      index: tiledImageIndex,
      replace: replace,
    });
  }

  static moveTiledImage(
    viewer: Viewer,
    oldTiledImageIndex: number,
    newTiledImageIndex: number,
  ): void {
    const tiledImage = viewer.world.getItemAt(oldTiledImageIndex);
    viewer.world.setItemIndex(tiledImage, newTiledImageIndex);
  }

  static updateTiledImage(viewer: Viewer, tiledImageIndex: number): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tiledImage = viewer.world.getItemAt(tiledImageIndex);
    // TODO update tiledImage
  }

  static deleteTiledImage(viewer: Viewer, tiledImageIndex: number): void {
    const tiledImage = viewer.world.getItemAt(tiledImageIndex);
    viewer.world.removeItem(tiledImage);
  }

  static destroyViewer(viewer: Viewer): void {
    viewer.destroy();
  }
}
