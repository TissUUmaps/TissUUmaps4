import { Drawer, Point, TiledImage, Viewer } from "openseadragon";

import { IImageData } from "../data/image";
import { ILabelsData } from "../data/labels";
import { ICustomTileSource } from "../data/types";
import { ILayerConfigModel } from "../models/base";
import { IImageModel } from "../models/image";
import { ILabelsModel } from "../models/labels";
import { ILayerModel } from "../models/layer";

export default class OpenSeadragonController {
  private readonly _viewer: Viewer;
  private readonly _tiledImageStates: TiledImageState[] = [];

  constructor(viewerElement: HTMLElement) {
    this._viewer = new Viewer({
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
    this._cleanTiledImages(layers, images, labels, imageData, labelsData);
    this._createOrUpdateTiledImages(
      layers,
      images,
      labels,
      imageData,
      labelsData,
    );
  }

  destroy(): void {
    this.synchronize(new Map(), new Map(), new Map(), new Map(), new Map());
    this._viewer.destroy();
  }

  getDrawer(): Drawer {
    return this._viewer.drawer;
  }

  private _cleanTiledImages(
    layers: Map<string, ILayerModel>,
    images: Map<string, IImageModel>,
    labels: Map<string, ILabelsModel>,
    imageData: Map<string, IImageData>,
    labelsData: Map<string, ILabelsData>,
  ): void {
    for (let i = 0; i < this._tiledImageStates.length; i++) {
      const tiledImageState = this._tiledImageStates[i];
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
        const tiledImage = this._viewer.world.getItemAt(i);
        this._viewer.world.removeItem(tiledImage);
        this._tiledImageStates.splice(i, 1);
        i--;
      }
    }
  }

  private _createOrUpdateTiledImages(
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
              const currentTiledImageIndex = this._tiledImageStates.findIndex(
                (tiledImageState) =>
                  "imageId" in tiledImageState &&
                  tiledImageState.imageId === imageId &&
                  tiledImageState.layerConfigId === layerConfigId,
              );
              this._createOrUpdateTiledImage(
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
              const currentTiledImageIndex = this._tiledImageStates.findIndex(
                (tiledImageState) =>
                  "labelsId" in tiledImageState &&
                  tiledImageState.labelsId === labelsId &&
                  tiledImageState.layerConfigId === layerConfigId,
              );
              this._createOrUpdateTiledImage(
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

  private _createOrUpdateTiledImage(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    currentTiledImageIndex: number,
    desiredTiledImageIndex: number,
    createTiledImageState: () => TiledImageState,
    createTileSource: () => string | ICustomTileSource,
  ): void {
    if (currentTiledImageIndex === -1) {
      this._createTiledImage(
        layer,
        imageOrLabels,
        layerConfig,
        desiredTiledImageIndex,
        createTiledImageState,
        createTileSource,
      );
    } else {
      const tiledImageState = this._tiledImageStates[currentTiledImageIndex];
      if (currentTiledImageIndex !== desiredTiledImageIndex) {
        if (tiledImageState.loaded) {
          const tiledImage = this._viewer.world.getItemAt(
            currentTiledImageIndex,
          );
          this._viewer.world.setItemIndex(tiledImage, desiredTiledImageIndex);
        } else {
          tiledImageState.deferredIndex = desiredTiledImageIndex;
        }
      }
      if (tiledImageState.loaded) {
        const tiledImage = this._viewer.world.getItemAt(currentTiledImageIndex);
        this._updateTiledImage(
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

  private _createTiledImage(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    newTiledImageIndex: number,
    createTiledImageState: () => TiledImageState,
    createTileSource: () => string | ICustomTileSource,
  ): void {
    const newTiledImageState = createTiledImageState();
    this._viewer.addTiledImage({
      tileSource: createTileSource(),
      index: newTiledImageIndex,
      degrees: layerConfig.rotation ?? 0,
      flipped: layerConfig.flipped ?? false,
      opacity: OpenSeadragonController._calculateOpacity(layer, imageOrLabels),
      success: (event) => {
        const newTiledImage = (event as unknown as { item: TiledImage }).item;
        newTiledImageState.imageWidth = newTiledImage.getContentSize().x;
        newTiledImageState.imageHeight = newTiledImage.getContentSize().y;
        if (
          newTiledImageState.deferredIndex !== undefined &&
          newTiledImageState.deferredIndex !== newTiledImageIndex
        ) {
          this._viewer.world.setItemIndex(
            newTiledImage,
            newTiledImageState.deferredIndex,
          );
          newTiledImageState.deferredIndex = undefined;
        }
        if (newTiledImageState.deferredUpdate) {
          this._updateTiledImage(
            layer,
            imageOrLabels,
            layerConfig,
            newTiledImage,
            newTiledImageState,
          );
          newTiledImageState.deferredUpdate = undefined;
        } else {
          this._updateTiledImagePositionAndSize(
            layer,
            layerConfig,
            newTiledImage,
            newTiledImageState,
          );
        }
        this._viewer.viewport.fitBounds(newTiledImage.getBounds(), true);
        newTiledImageState.loaded = true;
      },
    });
    this._tiledImageStates.splice(newTiledImageIndex, 0, newTiledImageState);
  }

  private _updateTiledImage(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    const degrees = layerConfig.rotation ?? 0;
    if (tiledImage.getRotation() !== degrees) {
      tiledImage.setRotation(degrees, true);
    }
    const flipped = layerConfig.flipped ?? false;
    if (tiledImage.getFlip() !== flipped) {
      tiledImage.setFlip(flipped);
    }
    const opacity = OpenSeadragonController._calculateOpacity(
      layer,
      imageOrLabels,
    );
    if (tiledImage.getOpacity() !== opacity) {
      tiledImage.setOpacity(opacity);
    }
    this._updateTiledImagePositionAndSize(
      layer,
      layerConfig,
      tiledImage,
      tiledImageState,
    );
  }

  private _updateTiledImagePositionAndSize(
    layer: ILayerModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    let x = 0;
    let y = 0;
    let width = tiledImageState.imageWidth!;
    if (layerConfig.scale !== undefined) {
      x *= layerConfig.scale;
      y *= layerConfig.scale;
      width *= layerConfig.scale;
    }
    if (layerConfig.translation !== undefined) {
      x += layerConfig.translation.x;
      y += layerConfig.translation.y;
    }
    if (layer.scale !== undefined) {
      x *= layer.scale;
      y *= layer.scale;
      width *= layer.scale;
    }
    if (layer.translation !== undefined) {
      x += layer.translation.x;
      y += layer.translation.y;
    }
    const bounds = tiledImage.getBounds();
    if (bounds.x !== x || bounds.y !== y) {
      tiledImage.setPosition(new Point(x, y), true);
    }
    if (bounds.width !== width) {
      tiledImage.setWidth(width, true);
    }
  }

  private static _calculateOpacity(
    layer: ILayerModel,
    imageOrLabels: IImageModel | ILabelsModel,
  ): number {
    const visibility =
      (layer.visibility ?? true) && (imageOrLabels.visibility ?? true);
    const opacity = (layer.opacity ?? 1) * (imageOrLabels.opacity ?? 1);
    return visibility ? opacity : 0;
  }
}

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
