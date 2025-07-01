import { Point, TiledImage, Viewer } from "openseadragon";

import { IImageData } from "../data/image";
import { ILabelsData } from "../data/labels";
import { ICustomTileSource } from "../data/types";
import { ILayerConfigModel } from "../models/base";
import { IImageModel } from "../models/image";
import { ILabelsModel } from "../models/labels";
import { ILayerModel } from "../models/layer";

type BaseTiledImageState = {
  loaded?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  deferredIndex?: number;
  deferredUpdate?: boolean;
};

type ImageTiledImageState = BaseTiledImageState & {
  imageId: string;
  layerConfigId: string;
};

type LabelsTiledImageState = BaseTiledImageState & {
  labelsId: string;
  layerConfigId: string;
};

type TiledImageState = ImageTiledImageState | LabelsTiledImageState;

export class ViewerController {
  private readonly viewer: Viewer;
  private readonly tiledImageStates: TiledImageState[] = [];

  constructor(viewerElement: HTMLElement) {
    this.viewer = new Viewer({
      element: viewerElement,
      // @ts-expect-error: 'drawer' is supported by OpenSeadragon but missing in types
      // https://github.com/usnistgov/OpenSeadragonFiltering/issues/34
      // also, according to Christophe Avenel, WebGL may be slower
      drawer: "canvas",
      showNavigator: true,
      showNavigationControl: false,
      imageSmoothingEnabled: false,
    });
  }

  synchronize(
    layers: Map<string, ILayerModel>,
    images: Map<string, IImageModel>,
    labels: Map<string, ILabelsModel>,
    imageData: Map<string, IImageData>,
    labelsData: Map<string, ILabelsData>,
  ): void {
    this.cleanTiledImages(layers, images, labels, imageData, labelsData);
    this.createOrUpdateTiledImages(
      layers,
      images,
      labels,
      imageData,
      labelsData,
    );
  }

  private cleanTiledImages(
    layers: Map<string, ILayerModel>,
    images: Map<string, IImageModel>,
    labels: Map<string, ILabelsModel>,
    imageData: Map<string, IImageData>,
    labelsData: Map<string, ILabelsData>,
  ): void {
    for (let i = 0; i < this.tiledImageStates.length; i++) {
      const tiledImageState = this.tiledImageStates[i];
      let keepTiledImage = false;
      const imageOrLabels =
        "imageId" in tiledImageState
          ? images.get(tiledImageState.imageId)
          : labels.get(tiledImageState.labelsId);
      if (
        imageOrLabels !== undefined &&
        ("imageId" in tiledImageState
          ? tiledImageState.imageId in imageData
          : tiledImageState.labelsId in labelsData)
      ) {
        const layerConfig = imageOrLabels.layerConfigs.get(
          tiledImageState.layerConfigId,
        );
        if (layerConfig !== undefined) {
          if (layers.has(layerConfig.layerId)) {
            keepTiledImage = true;
          }
        }
      }
      if (!keepTiledImage) {
        const tiledImage = this.viewer.world.getItemAt(i);
        this.viewer.world.removeItem(tiledImage);
        this.tiledImageStates.splice(i, 1);
        i--;
      }
    }
  }

  private createOrUpdateTiledImages(
    layerMap: Map<string, ILayerModel>,
    imageMap: Map<string, IImageModel>,
    labelsMap: Map<string, ILabelsModel>,
    imageDataMap: Map<string, IImageData>,
    labelsDataMap: Map<string, ILabelsData>,
  ): void {
    let desiredTiledImageIndex = 0;
    for (const [layerId, layer] of layerMap) {
      for (const [imageId, image] of imageMap) {
        const imageData = imageDataMap.get(imageId);
        if (imageData !== undefined) {
          for (const [layerConfigId, layerConfig] of image.layerConfigs) {
            if (layerConfig.layerId === layerId) {
              const currentTiledImageIndex = this.tiledImageStates.findIndex(
                (tiledImageState) =>
                  "imageId" in tiledImageState &&
                  tiledImageState.imageId === imageId &&
                  tiledImageState.layerConfigId === layerConfigId,
              );
              this.createOrUpdateTiledImage(
                layer,
                image,
                layerConfig,
                currentTiledImageIndex,
                desiredTiledImageIndex,
                () => ({ imageId: imageId, layerConfigId: layerConfigId }),
                () => imageData.getTileSource(),
              );
              desiredTiledImageIndex++;
            }
          }
        }
      }
      for (const [labelsId, labels] of labelsMap) {
        const labelsData = labelsDataMap.get(labelsId);
        if (labelsData !== undefined) {
          for (const [layerConfigId, layerConfig] of labels.layerConfigs) {
            if (layerConfig.layerId === layerId) {
              const currentTiledImageIndex = this.tiledImageStates.findIndex(
                (tiledImageState) =>
                  "labelsId" in tiledImageState &&
                  tiledImageState.labelsId === labelsId &&
                  tiledImageState.layerConfigId === layerConfigId,
              );
              this.createOrUpdateTiledImage(
                layer,
                labels,
                layerConfig,
                currentTiledImageIndex,
                desiredTiledImageIndex,
                () => ({ labelsId: labelsId, layerConfigId: layerConfigId }),
                () => {
                  throw new Error("Method not implemented"); // TODO
                },
              );
              desiredTiledImageIndex++;
            }
          }
        }
      }
    }
  }

  private createOrUpdateTiledImage(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    currentTiledImageIndex: number,
    desiredTiledImageIndex: number,
    createTiledImageState: () => TiledImageState,
    createTileSource: () => string | ICustomTileSource,
  ): void {
    if (currentTiledImageIndex === -1) {
      this.createTiledImage(
        layer,
        imageOrLabels,
        layerConfig,
        desiredTiledImageIndex,
        createTiledImageState,
        createTileSource,
      );
    } else {
      const tiledImageState = this.tiledImageStates[currentTiledImageIndex];
      if (currentTiledImageIndex !== desiredTiledImageIndex) {
        if (tiledImageState.loaded) {
          const tiledImage = this.viewer.world.getItemAt(
            currentTiledImageIndex,
          );
          this.viewer.world.setItemIndex(tiledImage, desiredTiledImageIndex);
        } else {
          tiledImageState.deferredIndex = desiredTiledImageIndex;
        }
      }
      if (tiledImageState.loaded) {
        const tiledImage = this.viewer.world.getItemAt(currentTiledImageIndex);
        this.updateTiledImage(
          layer,
          imageOrLabels,
          layerConfig,
          tiledImage,
          tiledImageState,
        );
      } else {
        tiledImageState.deferredUpdate = true;
      }
    }
  }

  private createTiledImage(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    newTiledImageIndex: number,
    createTiledImageState: () => TiledImageState,
    createTileSource: () => string | ICustomTileSource,
  ): void {
    const newTiledImageState = createTiledImageState();
    this.viewer.addTiledImage({
      tileSource: createTileSource(),
      index: newTiledImageIndex,
      degrees: imageOrLabels.degrees ?? 0,
      flipped: imageOrLabels.flipped ?? false,
      opacity: ViewerController.calculateOpacity(layer, imageOrLabels),
      success: (event) => {
        const newTiledImage = (event as unknown as { item: TiledImage }).item;
        newTiledImageState.imageWidth = newTiledImage.getContentSize().x;
        newTiledImageState.imageHeight = newTiledImage.getContentSize().y;
        if (
          newTiledImageState.deferredIndex !== undefined &&
          newTiledImageState.deferredIndex !== newTiledImageIndex
        ) {
          this.viewer.world.setItemIndex(
            newTiledImage,
            newTiledImageState.deferredIndex,
          );
          newTiledImageState.deferredIndex = undefined;
        }
        if (newTiledImageState.deferredUpdate) {
          this.updateTiledImage(
            layer,
            imageOrLabels,
            layerConfig,
            newTiledImage,
            newTiledImageState,
          );
          newTiledImageState.deferredUpdate = undefined;
        } else {
          this.updateTiledImagePositionAndSize(
            layer,
            imageOrLabels,
            layerConfig,
            newTiledImage,
            newTiledImageState,
          );
        }
        this.viewer.viewport.fitBounds(newTiledImage.getBounds(), true);
        newTiledImageState.loaded = true;
      },
    });
    this.tiledImageStates.splice(newTiledImageIndex, 0, newTiledImageState);
  }

  private updateTiledImage(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    const degrees = imageOrLabels.degrees ?? 0;
    if (tiledImage.getRotation() !== degrees) {
      tiledImage.setRotation(degrees, true);
    }
    const flipped = imageOrLabels.flipped ?? false;
    if (tiledImage.getFlip() !== flipped) {
      tiledImage.setFlip(flipped);
    }
    const opacity = ViewerController.calculateOpacity(layer, imageOrLabels);
    if (tiledImage.getOpacity() !== opacity) {
      tiledImage.setOpacity(opacity);
    }
    this.updateTiledImagePositionAndSize(
      layer,
      imageOrLabels,
      layerConfig,
      tiledImage,
      tiledImageState,
    );
  }

  private updateTiledImagePositionAndSize(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    let x = 0;
    let y = 0;
    let width = tiledImageState.imageWidth!;
    if (imageOrLabels.pixelSize !== undefined) {
      width *= imageOrLabels.pixelSize;
    }
    for (const tf of [layerConfig.tf2layer, layer.tf2world]) {
      if (tf !== undefined) {
        if (tf.scale !== undefined) {
          x *= tf.scale;
          y *= tf.scale;
          width *= tf.scale;
        }
        if (tf.x !== undefined) {
          x += tf.x;
        }
        if (tf.y !== undefined) {
          y += tf.y;
        }
      }
    }
    const bounds = tiledImage.getBounds();
    if (bounds.x !== x || bounds.y !== y) {
      tiledImage.setPosition(new Point(x, y), true);
    }
    if (bounds.width !== width) {
      tiledImage.setWidth(width, true);
    }
  }

  private static calculateOpacity(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
  ): number {
    const visibility =
      (layer.visibility ?? true) && (imageOrLabels.visibility ?? true);
    const opacity = (layer.opacity ?? 1) * (imageOrLabels.opacity ?? 1);
    return visibility ? opacity : 0;
  }

  destroy(): void {
    this.synchronize(new Map(), new Map(), new Map(), new Map(), new Map());
    this.viewer.destroy();
  }
}
