import { Point, Viewer } from "openseadragon";

import Image, { ImageData } from "../model/image";
import Layer from "../model/layer";

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLElement): Viewer {
    return new Viewer({
      element: viewerElement,
      // TODO Viewer options
    });
  }

  static createTiledImage(
    viewer: Viewer,
    index: number,
    layer: Layer,
    image: Image,
    imageData: ImageData,
    replace?: boolean,
  ): void {
    viewer.addTiledImage({
      tileSource: imageData.tileSource,
      index: index,
      replace: replace,
      x: layer.settings.x,
      y: layer.settings.y,
      width: imageData.width * layer.settings.scale,
      opacity:
        layer.settings.visibility && image.settings.visbility
          ? layer.settings.opacity * image.settings.opacity
          : 0,
      degrees: layer.settings.rotation,
      flipped: layer.settings.flipx,
    });
  }

  static moveTiledImage(
    viewer: Viewer,
    oldIndex: number,
    newIndex: number,
  ): void {
    const tiledImage = viewer.world.getItemAt(oldIndex);
    viewer.world.setItemIndex(tiledImage, newIndex);
  }

  static updateTiledImage(
    viewer: Viewer,
    index: number,
    layer: Layer,
    image: Image,
  ): void {
    const tiledImage = viewer.world.getItemAt(index);
    const bounds = tiledImage.getBounds();
    if (bounds.x !== layer.settings.x || bounds.y !== layer.settings.y) {
      tiledImage.setPosition(new Point(layer.settings.x, layer.settings.y));
    }
    const opacity =
      layer.settings.visibility && image.settings.visbility
        ? layer.settings.opacity * image.settings.opacity
        : 0;
    if (tiledImage.getOpacity() !== opacity) {
      tiledImage.setOpacity(opacity);
    }
    if (tiledImage.getRotation() !== layer.settings.rotation) {
      tiledImage.setRotation(layer.settings.rotation);
    }
    if (tiledImage.getFlip() !== layer.settings.flipx) {
      tiledImage.setFlip(layer.settings.flipx);
    }
  }

  static deleteTiledImage(viewer: Viewer, index: number): void {
    const tiledImage = viewer.world.getItemAt(index);
    viewer.world.removeItem(tiledImage);
  }

  static destroyViewer(viewer: Viewer): void {
    viewer.destroy();
  }
}
