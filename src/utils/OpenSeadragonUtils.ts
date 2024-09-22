import { Point, TiledImage, Viewer } from "openseadragon";

import Image from "../model/image";
import Layer from "../model/layer";

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLElement): Viewer {
    return new Viewer({
      element: viewerElement,
      showNavigator: true,
      showNavigationControl: false,
      imageSmoothingEnabled: false,
    });
  }

  static createTiledImage(
    viewer: Viewer,
    index: number,
    layer: Layer,
    image: Image,
    tileSource: string | object,
    success?: (tiledImage: TiledImage) => void,
  ): void {
    if (index < 0 || index > viewer.world.getItemCount()) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    viewer.addTiledImage({
      tileSource: tileSource,
      index: index,
      x: layer.settings.x,
      y: layer.settings.y,
      opacity:
        layer.settings.visibility && image.settings.visbility
          ? layer.settings.opacity * image.settings.opacity
          : 0,
      degrees: layer.settings.rotation,
      flipped: layer.settings.flipx,
      success: (event) => {
        // update width and height
        const e = event as unknown as { item: TiledImage };
        const contentSize = e.item.getContentSize();
        const physicalWidth = contentSize.x * image.settings.pixelSize;
        const physicalHeight = contentSize.y * image.settings.pixelSize;
        e.item.setWidth(physicalWidth * layer.settings.scale);
        e.item.setHeight(physicalHeight * layer.settings.scale);
        viewer.viewport.fitBounds(e.item.getBounds());
        if (success) {
          success(e.item);
        }
      },
    });
  }

  static moveTiledImage(
    viewer: Viewer,
    oldIndex: number,
    newIndex: number,
  ): void {
    if (oldIndex < 0 || oldIndex >= viewer.world.getItemCount()) {
      throw new Error(`Old index out of bounds: ${oldIndex}`);
    }
    if (newIndex < 0 || newIndex >= viewer.world.getItemCount()) {
      throw new Error(`New index out of bounds: ${newIndex}`);
    }
    const tiledImage = viewer.world.getItemAt(oldIndex);
    viewer.world.setItemIndex(tiledImage, newIndex);
  }

  static updateTiledImage(
    viewer: Viewer,
    index: number,
    layer: Layer,
    image: Image,
  ): void {
    if (index < 0 || index >= viewer.world.getItemCount()) {
      throw new Error(`Index out of bounds: ${index}`);
    }
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
    if (index < 0 || index >= viewer.world.getItemCount()) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    const tiledImage = viewer.world.getItemAt(index);
    viewer.world.removeItem(tiledImage);
  }

  static destroyViewer(viewer: Viewer): void {
    viewer.destroy();
  }
}
