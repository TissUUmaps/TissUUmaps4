import { Point, TiledImage, Viewer } from "openseadragon";

import Image from "../model/image";
import Layer from "../model/layer";
import { ImageReaderFactory } from "../readers/ImageReader";

export type TiledImageInfo = {
  layerId: string;
  imageId: string;
  preLoadIndex: number;
  postLoadIndex: number;
  postLoadUpdate?: boolean;
  loaded: boolean;
};

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLElement): Viewer {
    return new Viewer({
      element: viewerElement,
      showNavigator: true,
      showNavigationControl: false,
      imageSmoothingEnabled: false,
    });
  }

  static destroyViewer(viewer: Viewer) {
    viewer.destroy();
  }

  static updateViewer(
    viewer: Viewer,
    tiledImageInfos: TiledImageInfo[],
    layers: Map<string, Layer>,
    images: Map<string, Image>,
    imageReaderFactory: ImageReaderFactory<string>,
  ): TiledImageInfo[] {
    // delete old TiledImages
    const oldTiledImageInfos: TiledImageInfo[] = [];
    for (const oldTiledImageInfo of tiledImageInfos) {
      const layer = layers.get(oldTiledImageInfo.layerId);
      const image = images.get(oldTiledImageInfo.imageId);
      if (layer && image && image.layers.includes(oldTiledImageInfo.layerId)) {
        oldTiledImageInfos.push(oldTiledImageInfo);
      } else {
        const oldTiledImage = viewer.world.getItemAt(oldTiledImageInfos.length);
        viewer.world.removeItem(oldTiledImage);
      }
    }
    // create/update TiledImages
    const newTiledImageInfos: TiledImageInfo[] = [];
    for (const [layerId, layer] of layers) {
      for (const [imageId, image] of images) {
        if (image.layers.includes(layerId)) {
          const oldTiledImageIndex = oldTiledImageInfos.findIndex(
            (oldTiledImageInfo) =>
              oldTiledImageInfo.layerId === layerId &&
              oldTiledImageInfo.imageId === imageId,
          );
          if (oldTiledImageIndex === -1) {
            // create new TiledImage
            const imageReader = imageReaderFactory(image.data);
            if (imageReader) {
              const newTiledImageInfo: TiledImageInfo = {
                layerId: layerId,
                imageId: imageId,
                preLoadIndex: newTiledImageInfos.length,
                postLoadIndex: newTiledImageInfos.length,
                loaded: false,
              };
              OpenSeadragonUtils.createTiledImage(
                viewer,
                layer,
                image,
                imageReader.getTileSource(),
                newTiledImageInfo,
              );
              newTiledImageInfos.push(newTiledImageInfo);
            } else {
              console.warn(`Unsupported image data type: ${image.data.type}`);
            }
          } else {
            // update existing TiledImage
            const oldTiledImageInfo = oldTiledImageInfos[oldTiledImageIndex];
            if (oldTiledImageIndex !== newTiledImageInfos.length) {
              if (oldTiledImageInfo.loaded) {
                viewer.world.setItemIndex(
                  viewer.world.getItemAt(oldTiledImageIndex),
                  newTiledImageInfos.length,
                );
              } else {
                oldTiledImageInfo.postLoadIndex = newTiledImageInfos.length;
              }
            }
            if (oldTiledImageInfo.loaded) {
              OpenSeadragonUtils.updateTiledImage(
                viewer.world.getItemAt(oldTiledImageIndex),
                layer,
                image,
              );
            } else {
              oldTiledImageInfo.postLoadUpdate = true;
            }
            newTiledImageInfos.push(oldTiledImageInfo);
          }
        }
      }
    }
    return newTiledImageInfos;
  }

  private static createTiledImage(
    viewer: Viewer,
    layer: Layer,
    image: Image,
    tileSource: string | object,
    tiledImageInfo: TiledImageInfo,
  ): void {
    viewer.addTiledImage({
      tileSource: tileSource,
      index: tiledImageInfo.preLoadIndex,
      x: layer.x,
      y: layer.y,
      opacity:
        layer.visibility && image.visbility ? layer.opacity * image.opacity : 0,
      degrees: layer.rotation,
      flipped: layer.flipx,
      success: (event) => {
        // update width and height
        const e = event as unknown as { item: TiledImage };
        const contentSize = e.item.getContentSize();
        const physicalWidth = contentSize.x * image.pixelSize;
        const physicalHeight = contentSize.y * image.pixelSize;
        e.item.setWidth(physicalWidth * layer.scale);
        e.item.setHeight(physicalHeight * layer.scale);
        viewer.viewport.fitBounds(e.item.getBounds());
        // if necessary, perform delayed update
        if (tiledImageInfo.preLoadIndex !== tiledImageInfo.postLoadIndex) {
          viewer.world.setItemIndex(e.item, tiledImageInfo.postLoadIndex);
        }
        if (tiledImageInfo.postLoadUpdate) {
          OpenSeadragonUtils.updateTiledImage(e.item, layer, image);
        }
        tiledImageInfo.loaded = true;
      },
    });
  }

  private static updateTiledImage(
    tiledImage: TiledImage,
    layer: Layer,
    image: Image,
  ): void {
    const bounds = tiledImage.getBounds();
    if (bounds.x !== layer.x || bounds.y !== layer.y) {
      tiledImage.setPosition(new Point(layer.x, layer.y));
    }
    const opacity =
      layer.visibility && image.visbility ? layer.opacity * image.opacity : 0;
    if (tiledImage.getOpacity() !== opacity) {
      tiledImage.setOpacity(opacity);
    }
    if (tiledImage.getRotation() !== layer.rotation) {
      tiledImage.setRotation(layer.rotation);
    }
    if (tiledImage.getFlip() !== layer.flipx) {
      tiledImage.setFlip(layer.flipx);
    }
  }
}
