import { Point, TiledImage, Viewer } from "openseadragon";

import { IImageData } from "../data/image";
import { ILabelsData } from "../data/labels";
import { ICustomTileSource, TileSourceConfig } from "../data/types";
import { ILayerConfigModel } from "../models/base";
import { IImageLayerConfigModel, IImageModel } from "../models/image";
import { ILabelsLayerConfigModel, ILabelsModel } from "../models/labels";
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

  async synchronize(
    layerMap: Map<string, ILayerModel>,
    imageMap: Map<string, IImageModel>,
    labelsMap: Map<string, ILabelsModel>,
    loadImage: (image: IImageModel) => Promise<IImageData>,
    loadLabels: (labels: ILabelsModel) => Promise<ILabelsData>,
    checkAbort: () => boolean,
  ): Promise<void> {
    this._cleanTiledImages(layerMap, imageMap, labelsMap);
    await this._createOrUpdateTiledImages(
      layerMap,
      imageMap,
      labelsMap,
      loadImage,
      loadLabels,
      checkAbort,
    );
  }

  destroy(): void {
    this._viewer.destroy();
    this._tiledImageStates.length = 0;
  }

  getViewer(): Viewer {
    return this._viewer;
  }

  private _cleanTiledImages(
    layerMap: Map<string, ILayerModel>,
    imageMap: Map<string, IImageModel>,
    labelsMap: Map<string, ILabelsModel>,
  ): void {
    for (let i = 0; i < this._tiledImageStates.length; i++) {
      const tiledImageState = this._tiledImageStates[i];
      const keepTiledImage =
        "image" in tiledImageState
          ? imageMap.has(tiledImageState.image.id) &&
            tiledImageState.image.layerConfigs.includes(
              tiledImageState.layerConfig,
            ) &&
            layerMap.has(tiledImageState.layerConfig.layerId)
          : labelsMap.has(tiledImageState.labels.id) &&
            tiledImageState.labels.layerConfigs.includes(
              tiledImageState.layerConfig,
            ) &&
            layerMap.has(tiledImageState.layerConfig.layerId);

      if (!keepTiledImage) {
        if (tiledImageState.loaded) {
          const tiledImage = this._viewer.world.getItemAt(i);
          this._viewer.world.removeItem(tiledImage);
        } else {
          tiledImageState.deferredDelete = true;
        }
        this._tiledImageStates.splice(i, 1);
        i--;
      }
    }
  }

  private async _createOrUpdateTiledImages(
    layerMap: Map<string, ILayerModel>,
    imageMap: Map<string, IImageModel>,
    labelsMap: Map<string, ILabelsModel>,
    loadImage: (image: IImageModel) => Promise<IImageData>,
    loadLabels: (labels: ILabelsModel) => Promise<ILabelsData>,
    checkAbort: () => boolean,
  ): Promise<void> {
    let desiredIndex = 0;
    for (const layer of layerMap.values()) {
      for (const image of imageMap.values()) {
        for (const layerConfig of image.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let imageData = null;
          try {
            imageData = await loadImage(image);
          } catch (error) {
            console.error(`Failed to load image with ID ${image.id}`, error);
          }
          if (checkAbort()) {
            return;
          }
          if (imageData !== null) {
            const currentIndex = this._tiledImageStates.findIndex(
              (tiledImageState) =>
                "image" in tiledImageState &&
                tiledImageState.image === image &&
                tiledImageState.layerConfig === layerConfig,
            );
            this._createOrUpdateTiledImage(
              layer,
              image,
              layerConfig,
              currentIndex,
              desiredIndex,
              () => imageData.getTileSource(),
              () => ({ image: image, layerConfig: layerConfig }),
            );
            desiredIndex++;
          }
        }
      }
      for (const labels of labelsMap.values()) {
        for (const layerConfig of labels.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let labelsData = null;
          try {
            labelsData = await loadLabels(labels);
          } catch (error) {
            console.error(`Failed to load labels with ID ${labels.id}`, error);
          }
          if (checkAbort()) {
            return;
          }
          if (labelsData !== null) {
            const currentIndex = this._tiledImageStates.findIndex(
              (tiledImageState) =>
                "labels" in tiledImageState &&
                tiledImageState.labels === labels &&
                tiledImageState.layerConfig === layerConfig,
            );
            this._createOrUpdateTiledImage(
              layer,
              labels,
              layerConfig,
              currentIndex,
              desiredIndex,
              () => {
                throw new Error("Method not implemented"); // TODO
              },
              () => ({ labels: labels, layerConfig: layerConfig }),
            );
            desiredIndex++;
          }
        }
      }
    }
  }

  private _createOrUpdateTiledImage(
    layer: ILayerModel,
    object: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    currentIndex: number,
    desiredIndex: number,
    createTileSource: () => string | TileSourceConfig | ICustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void {
    if (currentIndex === -1) {
      this._createTiledImage(
        desiredIndex,
        layer,
        object,
        layerConfig,
        createTileSource,
        createTiledImageState,
      );
    } else {
      const tiledImageState = this._tiledImageStates[currentIndex];
      if (currentIndex !== desiredIndex) {
        if (tiledImageState.loaded) {
          const tiledImage = this._viewer.world.getItemAt(currentIndex);
          this._viewer.world.setItemIndex(tiledImage, desiredIndex);
        } else {
          tiledImageState.deferredIndex = desiredIndex;
        }
      }
      if (tiledImageState.loaded) {
        const tiledImage = this._viewer.world.getItemAt(currentIndex);
        this._updateTiledImage(
          layer,
          object,
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
    index: number,
    layer: ILayerModel,
    object: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    createTileSource: () => string | TileSourceConfig | ICustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void {
    const newTiledImageState = createTiledImageState();
    const flip = layerConfig.flip ?? false;
    this._viewer.addTiledImage({
      tileSource: createTileSource(),
      index: index,
      degrees: layerConfig.rotation ?? 0,
      // https://github.com/openseadragon/openseadragon/issues/2765
      // flipped: layerConfig.flip ?? false,
      opacity: OpenSeadragonController._calculateOpacity(layer, object),
      success: (event) => {
        const newTiledImage = (event as unknown as { item: TiledImage }).item;
        newTiledImageState.imageWidth = newTiledImage.getContentSize().x;
        newTiledImageState.imageHeight = newTiledImage.getContentSize().y;
        newTiledImage.setFlip(flip);
        if (
          newTiledImageState.deferredIndex !== undefined &&
          newTiledImageState.deferredIndex !== index
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
            object,
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
        if (newTiledImageState.deferredDelete) {
          this._viewer.world.removeItem(newTiledImage);
          newTiledImageState.deferredDelete = undefined;
        }
      },
    });
    this._tiledImageStates.splice(index, 0, newTiledImageState);
  }

  private _updateTiledImage(
    layer: ILayerModel,
    object: IImageModel | ILabelsModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    const degrees = layerConfig.rotation ?? 0.0;
    if (tiledImage.getRotation() !== degrees) {
      tiledImage.setRotation(degrees, true);
    }
    const flip = layerConfig.flip ?? false;
    if (tiledImage.getFlip() !== flip) {
      tiledImage.setFlip(flip);
    }
    const opacity = OpenSeadragonController._calculateOpacity(layer, object);
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
    let x = 0.0;
    let y = 0.0;
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
    object: IImageModel | ILabelsModel,
  ): number {
    const visibility =
      (layer.visibility ?? true) && (object.visibility ?? true);
    const opacity = (layer.opacity ?? 1) * (object.opacity ?? 1);
    return visibility ? opacity : 0.0;
  }
}

type BaseTiledImageState = {
  loaded?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  deferredIndex?: number;
  deferredUpdate?: boolean;
  deferredDelete?: boolean;
};

type ImageTiledImageState = BaseTiledImageState & {
  image: IImageModel;
  layerConfig: IImageLayerConfigModel;
};

type LabelsTiledImageState = BaseTiledImageState & {
  labels: ILabelsModel;
  layerConfig: ILabelsLayerConfigModel;
};

type TiledImageState = ImageTiledImageState | LabelsTiledImageState;
