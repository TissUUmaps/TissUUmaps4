import { mat3 } from "gl-matrix";
import OpenSeadragon, { Point, TiledImage, Viewer } from "openseadragon";

import { IImageData } from "../data/image";
import { ILabelsData } from "../data/labels";
import { ICustomTileSource, TileSourceConfig } from "../data/types";
import { ILayerConfigModel } from "../models/base";
import { IImageLayerConfigModel, IImageModel } from "../models/image";
import { ILabelsLayerConfigModel, ILabelsModel } from "../models/labels";
import { ILayerModel } from "../models/layer";
import { ViewerAnimationOptions, ViewerOptions } from "../models/types";
import TransformUtils from "../utils/TransformUtils";

export default class OpenSeadragonController {
  static readonly DEFAULT_VIEWER_OPTIONS: Exclude<
    ViewerOptions,
    "element" | "drawer"
  > = {
    minZoomImageRatio: 0,
    maxZoomPixelRatio: Infinity,
    preserveImageSizeOnResize: true,
    visibilityRatio: 0,
    animationTime: 0,
    gestureSettingsMouse: {
      flickEnabled: false,
    },
    gestureSettingsTouch: {
      flickEnabled: false,
    },
    gestureSettingsPen: {
      flickEnabled: false,
    },
    gestureSettingsUnknown: {
      flickEnabled: false,
    },
    zoomPerClick: 1,
    showNavigator: true,
    navigatorPosition: "BOTTOM_LEFT",
    maxImageCacheCount: 2000,
    showNavigationControl: false,
    imageSmoothingEnabled: false,
  };
  static readonly DEFAULT_VIEWER_ANIMATION_START_OPTIONS: ViewerAnimationOptions =
    {
      viewer: {
        immediateRender: false,
        imageLoaderLimit: 1,
      },
      tiledImage: {
        immediateRender: false,
        imageLoaderLimit: 1,
      },
    };
  static readonly DEFAULT_VIEWER_ANIMATION_FINISH_OPTIONS: ViewerAnimationOptions =
    {
      viewer: {
        immediateRender: true,
      },
      tiledImage: {
        immediateRender: true,
      },
    };

  private readonly _viewer: Viewer;
  private readonly _tiledImageStates: TiledImageState[] = [];
  private readonly _animationMemory: {
    viewerValues: Record<string, unknown>;
    tiledImageValues: Record<string, unknown>[];
  } = {
    viewerValues: {},
    tiledImageValues: [],
  };
  private _animationStartHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _animationFinishHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;

  static createViewer(
    viewerElement: HTMLElement,
    viewerOptions: Partial<ViewerOptions>,
  ): Viewer {
    viewerOptions = {
      ...OpenSeadragonController.DEFAULT_VIEWER_OPTIONS,
      ...viewerOptions,
    };
    const viewer = new Viewer({
      ...viewerOptions,
      element: viewerElement,
      // https://github.com/usnistgov/OpenSeadragonFiltering/issues/34
      // also, according to Christophe Avenel, WebGL may actually be slower
      drawer: "canvas",
    });
    // disable key bindings for rotation and flipping
    viewer.addHandler("canvas-key", (event) => {
      const originalEvent = event.originalEvent as KeyboardEvent;
      if (["r", "R", "f"].includes(originalEvent.key)) {
        event.preventDefaultAction = true;
      }
    });
    return viewer;
  }

  constructor(viewer: Viewer) {
    this._viewer = viewer;
  }

  configureAnimationHandlers(
    viewerAnimationStartOptions: Partial<ViewerAnimationOptions>,
    viewerAnimationFinishOptions: Partial<ViewerAnimationOptions>,
  ): void {
    viewerAnimationStartOptions = {
      ...OpenSeadragonController.DEFAULT_VIEWER_ANIMATION_START_OPTIONS,
      ...viewerAnimationStartOptions,
    };
    viewerAnimationFinishOptions = {
      ...OpenSeadragonController.DEFAULT_VIEWER_ANIMATION_FINISH_OPTIONS,
      ...viewerAnimationFinishOptions,
    };
    if (this._animationStartHandler !== undefined) {
      this._viewer.removeHandler(
        "animation-start",
        this._animationStartHandler,
      );
      this._animationStartHandler = undefined;
    }
    if (this._animationFinishHandler !== undefined) {
      this._viewer.removeHandler(
        "animation-finish",
        this._animationFinishHandler,
      );
      this._animationFinishHandler = undefined;
    }
    this._animationStartHandler = () => {
      // memorize and change viewer property values as configured
      this._animationMemory.viewerValues = {};
      if (viewerAnimationStartOptions.viewer !== undefined) {
        for (const property of Object.keys(
          viewerAnimationStartOptions.viewer,
        )) {
          // @ts-expect-error: dynamic property access
          this._animationMemory.viewerValues[property] = this._viewer[property];
        }
        Object.assign(this._viewer, viewerAnimationStartOptions.viewer);
      }
      // memorize and change tiled image property values as configured
      this._animationMemory.tiledImageValues = [];
      if (viewerAnimationStartOptions.tiledImage !== undefined) {
        for (let i = 0; i < this._viewer.world.getItemCount(); i++) {
          const tiledImage = this._viewer.world.getItemAt(i);
          const tiledImageValues: Record<string, unknown> = {};
          for (const property of Object.keys(
            viewerAnimationStartOptions.tiledImage,
          )) {
            // @ts-expect-error: dynamic property access
            tiledImageValues[property] = tiledImage[property];
          }
          this._animationMemory.tiledImageValues.push(tiledImageValues);
          Object.assign(tiledImage, viewerAnimationStartOptions.tiledImage);
        }
      }
    };
    this._animationFinishHandler = () => {
      const viewerValues = this._animationMemory.viewerValues;
      // override memorized viewer property values as configured
      if (viewerAnimationFinishOptions.viewer !== undefined) {
        for (const property of Object.keys(
          viewerAnimationFinishOptions.viewer,
        )) {
          viewerValues[property] =
            viewerAnimationFinishOptions.viewer[property];
        }
      }
      const tiledImageValues = this._animationMemory.tiledImageValues;
      // override memorized tiled image property values as configured
      if (viewerAnimationFinishOptions.tiledImage !== undefined) {
        for (const property of Object.keys(
          viewerAnimationFinishOptions.tiledImage,
        )) {
          for (let i = 0; i < this._viewer.world.getItemCount(); i++) {
            tiledImageValues[i]![property] =
              viewerAnimationFinishOptions.tiledImage[property];
          }
        }
      }
      // restore viewer and tiled image property values from memory
      Object.assign(this._viewer, viewerValues);
      for (let i = 0; i < this._viewer.world.getItemCount(); i++) {
        const tiledImage = this._viewer.world.getItemAt(i);
        Object.assign(tiledImage, tiledImageValues[i]);
      }
    };
    this._viewer.addHandler("animation-start", this._animationStartHandler);
    this._viewer.addHandler("animation-finish", this._animationFinishHandler);
  }

  async synchronize(
    layerMap: Map<string, ILayerModel>,
    imageMap: Map<string, IImageModel>,
    labelsMap: Map<string, ILabelsModel>,
    loadImage: (
      image: IImageModel,
      signal?: AbortSignal,
    ) => Promise<IImageData>,
    loadLabels: (
      labels: ILabelsModel,
      signal?: AbortSignal,
    ) => Promise<ILabelsData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    this._cleanTiledImages(layerMap, imageMap, labelsMap);
    await this._createOrUpdateTiledImages(
      layerMap,
      imageMap,
      labelsMap,
      loadImage,
      loadLabels,
      signal,
    );
  }

  getViewportBounds(): OpenSeadragon.Rect {
    return this._viewer.viewport.getBounds(true);
  }

  destroy(): void {
    this._viewer.destroy();
    this._tiledImageStates.length = 0;
  }

  private _cleanTiledImages(
    layerMap: Map<string, ILayerModel>,
    imageMap: Map<string, IImageModel>,
    labelsMap: Map<string, ILabelsModel>,
  ): void {
    for (let i = 0; i < this._tiledImageStates.length; i++) {
      const tiledImageState = this._tiledImageStates[i]!;
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
    loadImage: (
      image: IImageModel,
      signal?: AbortSignal,
    ) => Promise<IImageData>,
    loadLabels: (
      labels: ILabelsModel,
      signal?: AbortSignal,
    ) => Promise<ILabelsData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    let desiredIndex = 0;
    for (const layer of layerMap.values()) {
      for (const image of imageMap.values()) {
        for (const layerConfig of image.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let imageData = null;
          try {
            imageData = await loadImage(image, signal);
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load image with ID '${image.id}'`,
                error,
              );
            }
          }
          signal?.throwIfAborted();
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
            labelsData = await loadLabels(labels, signal);
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load labels with ID '${labels.id}'`,
                error,
              );
            }
          }
          signal?.throwIfAborted();
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
                // TODO labels tile source
                throw new Error("Method not implemented");
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
    pixels: IPixelsModel,
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
        pixels,
        layerConfig,
        createTileSource,
        createTiledImageState,
      );
    } else {
      const tiledImageState = this._tiledImageStates[currentIndex]!;
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
          pixels,
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
    pixels: IPixelsModel,
    layerConfig: ILayerConfigModel,
    createTileSource: () => string | TileSourceConfig | ICustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void {
    const newTiledImageState = createTiledImageState();
    this._viewer.addTiledImage({
      tileSource: createTileSource(),
      index: index,
      // https://github.com/openseadragon/openseadragon/issues/2765
      // flipped: layerConfig.flip ?? false,
      opacity: OpenSeadragonController._calculateOpacity(layer, pixels),
      success: (event) => {
        const newTiledImage = (event as unknown as { item: TiledImage }).item;
        newTiledImageState.imageWidth = newTiledImage.getContentSize().x;
        newTiledImageState.imageHeight = newTiledImage.getContentSize().y;
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
            pixels,
            layerConfig,
            newTiledImage,
            newTiledImageState,
          );
          newTiledImageState.deferredUpdate = undefined;
        } else {
          this._updateTiledImageTransform(
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
    pixels: IPixelsModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    const flip = layerConfig.flip ?? false;
    if (tiledImage.getFlip() !== flip) {
      tiledImage.setFlip(flip);
    }
    const opacity = OpenSeadragonController._calculateOpacity(layer, pixels);
    if (tiledImage.getOpacity() !== opacity) {
      tiledImage.setOpacity(opacity);
    }
    this._updateTiledImageTransform(
      layer,
      layerConfig,
      tiledImage,
      tiledImageState,
    );
  }

  private _updateTiledImageTransform(
    layer: ILayerModel,
    layerConfig: ILayerConfigModel,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    const m = mat3.create();
    if (layerConfig.transform !== undefined) {
      const dataToLayerMatrix = TransformUtils.toMatrix(layerConfig.transform, {
        x: tiledImageState.imageWidth! / 2,
        y: tiledImageState.imageHeight! / 2,
      });
      mat3.multiply(m, dataToLayerMatrix, m);
    }
    if (layer.transform !== undefined) {
      const layerToWorldMatrix = TransformUtils.toMatrix(layer.transform);
      mat3.multiply(m, layerToWorldMatrix, m);
    }
    const dataToWorldTransform = TransformUtils.fromMatrix(m);
    const bounds = tiledImage.getBounds();
    const flip = layerConfig.flip ?? false;
    if (tiledImage.getFlip() !== flip) {
      tiledImage.setFlip(flip);
    }
    const width = tiledImageState.imageWidth! * dataToWorldTransform.scale;
    if (bounds.width !== width) {
      tiledImage.setWidth(width, true);
    }
    const rotation = dataToWorldTransform.rotation;
    if (tiledImage.getRotation() !== rotation) {
      tiledImage.setRotation(rotation, true);
    }
    const { x, y } = dataToWorldTransform.translation;
    if (bounds.x !== x || bounds.y !== y) {
      tiledImage.setPosition(new Point(x, y), true);
    }
  }

  private static _calculateOpacity(
    layer: ILayerModel,
    pixels: IPixelsModel,
  ): number {
    const visibility =
      (layer.visibility ?? true) && (pixels.visibility ?? true);
    const opacity = (layer.opacity ?? 1) * (pixels.opacity ?? 1);
    return visibility ? opacity : 0.0;
  }
}

type IPixelsModel = IImageModel | ILabelsModel;

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

// add missing OpenSeadragon types
declare module "openseadragon" {
  interface Viewer {
    immediateRender: boolean | undefined;
  }

  interface TiledImage {
    immediateRender: boolean | undefined;
  }

  interface Options {
    drawer?: "canvas" | "webgl";
  }
}
