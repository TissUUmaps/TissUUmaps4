import { Viewer } from "openseadragon";

// import { ImageDataSourceBase } from "../datasources/base";
// import {
//   ImageDataSourceModel,
//   ImageLayerConfigModel,
//   ImageModel,
// } from "../models/image";
// import { LayerModel } from "../models/layer";
// import TransformUtils from "./TransformUtils";

export default class OpenSeadragonUtils {
  static createViewer(viewerElement: HTMLElement): Viewer {
    return new Viewer({
      element: viewerElement,
      // @ts-expect-error: 'drawer' is supported by OpenSeadragon but missing in types
      drawer: "canvas", // https://github.com/usnistgov/OpenSeadragonFiltering/issues/34
      showNavigator: true,
      showNavigationControl: false,
      imageSmoothingEnabled: false,
    });
  }

  static destroyViewer(viewer: Viewer) {
    viewer.destroy();
  }

  //   static updateViewer(
  //     viewer: Viewer,
  //     images: Map<string, ImageModel>,
  //     layers: Map<string, LayerModel>,
  //     tiledImageStates: TiledImageState[],
  //     imageDataSourceFactory: (
  //       config: ImageDataSourceModel<string>,
  //     ) => ImageDataSourceBase<ImageDataSourceModel<string>> | undefined,
  //   ): TiledImageState[] {
  //     // delete old TiledImages
  //     const existingTiledImageStates: TiledImageState[] = [];
  //     for (const oldTiledImageState of tiledImageStates) {
  //       let removeTiledImageFromViewer = true;
  //       const image = images.get(oldTiledImageState.imageId);
  //       if (image) {
  //         const imageLayerConfig = image.layerConfigs.get(
  //           oldTiledImageState.layerConfigId,
  //         );
  //         if (imageLayerConfig && layers.has(imageLayerConfig.layerId)) {
  //           existingTiledImageStates.push(oldTiledImageState);
  //           removeTiledImageFromViewer = false;
  //         }
  //       }
  //       if (removeTiledImageFromViewer) {
  //         const tiledImage = viewer.world.getItemAt(
  //           existingTiledImageStates.length,
  //         );
  //         viewer.world.removeItem(tiledImage);
  //       }
  //     }
  //     // create/update TiledImages
  //     const newTiledImageStates: TiledImageState[] = [];
  //     for (const [layerId, layer] of layers) {
  //       for (const [imageId, image] of images) {
  //         for (const [
  //           imageLayerConfigId,
  //           imageLayerConfig,
  //         ] of image.layerConfigs) {
  //           if (imageLayerConfig.layerId === layerId) {
  //             const existingTiledImageIndex = existingTiledImageStates.findIndex(
  //               (existingTiledImageState) =>
  //                 existingTiledImageState.imageId === imageId &&
  //                 existingTiledImageState.layerConfigId === imageLayerConfigId,
  //             );
  //             if (existingTiledImageIndex === -1) {
  //               // create new TiledImage
  //               const imageDataSource = imageDataSourceFactory(image.dataSource);
  //               if (imageDataSource) {
  //                 const newTiledImageState: TiledImageState = {
  //                   imageId: imageId,
  //                   layerConfigId: imageLayerConfigId,
  //                   preLoadIndex: newTiledImageStates.length,
  //                   postLoadIndex: newTiledImageStates.length,
  //                   loaded: false,
  //                 };
  //                 OpenSeadragonUtils.createTiledImage(
  //                   viewer,
  //                   image,
  //                   layer,
  //                   imageLayerConfig,
  //                   imageDataSource.getImage(),
  //                   newTiledImageState,
  //                 );
  //                 newTiledImageStates.push(newTiledImageState);
  //               } else {
  //                 console.warn(
  //                   `Unsupported image source type: ${image.dataSource.type}`,
  //                 );
  //               }
  //             } else {
  //               // update existing TiledImage
  //               const existingTiledImageState =
  //                 existingTiledImageStates[existingTiledImageIndex];
  //               // if necessary, move existing TiledImage to new index
  //               if (existingTiledImageIndex !== newTiledImageStates.length) {
  //                 // if possible, instantly move TiledImage to new index
  //                 if (existingTiledImageState.loaded) {
  //                   const tiledImage = viewer.world.getItemAt(
  //                     existingTiledImageIndex,
  //                   );
  //                   viewer.world.setItemIndex(
  //                     tiledImage,
  //                     newTiledImageStates.length,
  //                   );
  //                 } else {
  //                   // otherwise, delay moving TiledImage to new index
  //                   existingTiledImageState.postLoadIndex =
  //                     newTiledImageStates.length;
  //                 }
  //               }
  //               // if possible, instantly update TiledImage
  //               if (existingTiledImageState.loaded) {
  //                 const tiledImage = viewer.world.getItemAt(
  //                   existingTiledImageIndex,
  //                 );
  //                 OpenSeadragonUtils.updateTiledImage(
  //                   viewer,
  //                   layer,
  //                   image,
  //                   imageLayerConfig,
  //                   tiledImage,
  //                   existingTiledImageState,
  //                 );
  //               } else {
  //                 // otherwise, delay updating TiledImage
  //                 existingTiledImageState.postLoadUpdate = true;
  //               }
  //               newTiledImageStates.push(existingTiledImageState);
  //             }
  //           }
  //         }
  //       }
  //     }
  //     return newTiledImageStates;
  //   }

  //   private static createTiledImage(
  //     viewer: Viewer,
  //     image: ImageModel,
  //     layer: LayerModel,
  //     imageLayerConfig: ImageLayerConfigModel,
  //     tileSource: string | object,
  //     tiledImageState: TiledImageState,
  //   ): void {
  //     const visibility = (layer.visibility ?? true) && (image.visibility ?? true);
  //     const realOpacity = (layer.opacity ?? 1) * (image.opacity ?? 1);
  //     const tf = TransformUtils.chain(
  //       imageLayerConfig.tf2layer ?? TransformUtils.IDENTITY,
  //       layer.tf2world ?? TransformUtils.IDENTITY,
  //     );
  //     viewer.addTiledImage({
  //       tileSource: tileSource,
  //       index: tiledImageState.preLoadIndex,
  //       x: tf.translation?.x ?? 0,
  //       y: tf.translation?.y ?? 0,
  //       opacity: visibility ? realOpacity : 0,
  //       degrees: tf.rotation ?? 0,
  //       flipped: tf.flip ?? false,
  //       success: (event) => {
  //         const tiledImage = (event as unknown as { item: TiledImage }).item;
  //         // store original image width and height
  //         const contentSize = tiledImage.getContentSize();
  //         tiledImageState.imageWidth = contentSize.x;
  //         tiledImageState.imageHeight = contentSize.y;
  //         // if necessary, move TiledImage to new index
  //         if (tiledImageState.preLoadIndex !== tiledImageState.postLoadIndex) {
  //           viewer.world.setItemIndex(tiledImage, tiledImageState.postLoadIndex);
  //         }
  //         // if necessary, update TiledImage
  //         if (tiledImageState.postLoadUpdate) {
  //           OpenSeadragonUtils.updateTiledImage(
  //             viewer,
  //             layer,
  //             image,
  //             imageLayerConfig,
  //             tiledImage,
  //             tiledImageState,
  //           );
  //         } else {
  //           // otherwise, just set TiledImage scale
  //           const scale = (image.pixelSize ?? 1) * (tf.scale ?? 1);
  //           OpenSeadragonUtils.updateTiledImageScale(
  //             viewer,
  //             tiledImage,
  //             tiledImageState,
  //             scale,
  //           );
  //         }
  //         tiledImageState.loaded = true;
  //       },
  //     });
  //   }

  //   private static updateTiledImage(
  //     viewer: Viewer,
  //     layer: LayerModel,
  //     image: ImageModel,
  //     imageLayerConfig: ImageLayerConfigModel,
  //     tiledImage: TiledImage,
  //     imageState: TiledImageState,
  //   ): void {
  //     const visibility = (layer.visibility ?? true) && (image.visibility ?? true);
  //     const realOpacity = (layer.opacity ?? 1) * (image.opacity ?? 1);
  //     const tf = TransformUtils.chain(
  //       imageLayerConfig.tf2layer ?? TransformUtils.IDENTITY,
  //       layer.tf2world ?? TransformUtils.IDENTITY,
  //     );
  //     // opacity
  //     const opacity = visibility ? realOpacity : 0;
  //     if (tiledImage.getOpacity() !== opacity) {
  //       tiledImage.setOpacity(opacity);
  //     }
  //     // x, y
  //     const x = tf.translation?.x ?? 0;
  //     const y = tf.translation?.y ?? 0;
  //     const bounds = tiledImage.getBounds();
  //     if (bounds.x !== x || bounds.y !== y) {
  //       tiledImage.setPosition(new Point(x, y));
  //     }
  //     // rotation
  //     const rotation = tf.rotation ?? 0;
  //     if (tiledImage.getRotation() !== rotation) {
  //       tiledImage.setRotation(rotation);
  //     }
  //     // flip
  //     const flip = tf.flip ?? false;
  //     if (tiledImage.getFlip() !== flip) {
  //       tiledImage.setFlip(flip);
  //     }
  //     // scale
  //     const scale = (image.pixelSize ?? 1) * (tf.scale ?? 1);
  //     OpenSeadragonUtils.updateTiledImageScale(
  //       viewer,
  //       tiledImage,
  //       imageState,
  //       scale,
  //     );
  //   }

  //   private static updateTiledImageScale(
  //     viewer: Viewer,
  //     tiledImage: TiledImage,
  //     tiledImageState: TiledImageState,
  //     scale: number,
  //   ): void {
  //     tiledImage.setWidth(tiledImageState.imageWidth! * scale);
  //     tiledImage.setHeight(tiledImageState.imageHeight! * scale);
  //     viewer.viewport.fitBounds(tiledImage.getBounds());
  //   }
}

// export type TiledImageState = {
//   imageId: string;
//   layerConfigId: string;
//   preLoadIndex: number;
//   postLoadIndex: number;
//   postLoadUpdate?: boolean;
//   imageWidth?: number;
//   imageHeight?: number;
//   loaded: boolean;
// };
