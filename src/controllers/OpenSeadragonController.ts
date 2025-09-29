import { mat3 } from "gl-matrix";
import {
  EventHandler,
  Point,
  Rect,
  TiledImage,
  Viewer,
  ViewerEvent,
} from "openseadragon";

import { CustomTileSource, ImageData, TileSourceConfig } from "../data/image";
import { LabelsData } from "../data/labels";
import {
  Image,
  ImageLayerConfig,
  RawImageLayerConfig,
  createImageLayerConfig,
} from "../models/image";
import {
  Labels,
  LabelsLayerConfig,
  RawLabelsLayerConfig,
  createLabelsLayerConfig,
} from "../models/labels";
import { Layer } from "../models/layer";
import { DEFAULT_VIEWER_OPTIONS } from "../models/project";
import { ViewerOptions } from "../types";
import TransformUtils from "../utils/TransformUtils";

type BaseTiledImageState = {
  loaded?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  deferredIndex?: number;
  deferredUpdate?: boolean;
  deferredDelete?: boolean;
};

type ImageTiledImageState = BaseTiledImageState & {
  image: Image;
  rawLayerConfig: RawImageLayerConfig;
};

type LabelsTiledImageState = BaseTiledImageState & {
  labels: Labels;
  rawLayerConfig: RawLabelsLayerConfig;
};

type TiledImageState = ImageTiledImageState | LabelsTiledImageState;

export default class OpenSeadragonController {
  private readonly _viewer: Viewer;
  private readonly _tiledImageStates: TiledImageState[] = [];
  private readonly _animationMemory: {
    viewerValues: Partial<ViewerOptions>;
    tiledImageValues: Partial<ViewerOptions>[];
  } = {
    viewerValues: {},
    tiledImageValues: [],
  };
  private _animationStartHandler?: EventHandler<ViewerEvent>;
  private _animationFinishHandler?: EventHandler<ViewerEvent>;

  static createViewer(viewerElement: HTMLElement): Viewer {
    const viewer = new Viewer({
      ...DEFAULT_VIEWER_OPTIONS,
      // do not forget to exclude properties from the ViewerOptions type when setting them here
      element: viewerElement,
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

  setViewerOptions(viewerOptions: ViewerOptions): void {
    // TODO allow more than one level (deep nested shallow merge)
    for (const [key, value] of Object.entries(viewerOptions)) {
      // @ts-expect-error: dynamic property access
      if (key in this._viewer && this._viewer[key] !== value) {
        // shallow merge of nested objects (first level only)
        if (typeof value === "object" && value !== null) {
          // @ts-expect-error: dynamic property access
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this._viewer[key] = { ...this._viewer[key], ...value };
        } else {
          // @ts-expect-error: dynamic property access
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this._viewer[key] = value;
        }
      }
      for (let i = 0; i < this._viewer.world.getItemCount(); i++) {
        const tiledImage = this._viewer.world.getItemAt(i);
        // @ts-expect-error: dynamic property access
        if (key in tiledImage && tiledImage[key] !== value) {
          // shallow merge of nested objects (first level only)
          if (typeof value === "object" && value !== null) {
            // @ts-expect-error: dynamic property access
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tiledImage[key] = { ...tiledImage[key], ...value };
          } else {
            // @ts-expect-error: dynamic property access
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tiledImage[key] = value;
          }
        }
      }
    }
  }

  configureAnimationHandlers(
    viewerAnimationStartOptions: ViewerOptions,
    viewerAnimationFinishOptions: ViewerOptions,
  ): void {
    if (this._animationStartHandler !== undefined) {
      this._viewer.removeHandler(
        "animation-start",
        this._animationStartHandler,
      );
    }
    if (this._animationFinishHandler !== undefined) {
      this._viewer.removeHandler(
        "animation-finish",
        this._animationFinishHandler,
      );
    }
    this._animationStartHandler = () => {
      this._animationMemory.viewerValues = {};
      this._animationMemory.tiledImageValues = [];
      for (const key of Object.keys(viewerAnimationStartOptions)) {
        // @ts-expect-error: dynamic property access
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this._animationMemory.viewerValues[key] = this._viewer[key];
      }
      for (let i = 0; i < this._viewer.world.getItemCount(); i++) {
        const tiledImage = this._viewer.world.getItemAt(i);
        const tiledImageValues: Partial<ViewerOptions> = {};
        for (const property of Object.keys(viewerAnimationStartOptions)) {
          if (property in tiledImage) {
            // @ts-expect-error: dynamic property access
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tiledImageValues[property] = tiledImage[property];
          }
        }
        this._animationMemory.tiledImageValues.push(tiledImageValues);
      }
      this.setViewerOptions(viewerAnimationStartOptions);
    };
    this._animationFinishHandler = () => {
      this.setViewerOptions({
        ...this._animationMemory.viewerValues,
        ...viewerAnimationFinishOptions,
      });
    };
    this._viewer.addHandler("animation-start", this._animationStartHandler);
    this._viewer.addHandler("animation-finish", this._animationFinishHandler);
  }

  async synchronize(
    layerMap: Map<string, Layer>,
    imageMap: Map<string, Image>,
    labelsMap: Map<string, Labels>,
    loadImage: (image: Image, signal?: AbortSignal) => Promise<ImageData>,
    loadLabels: (labels: Labels, signal?: AbortSignal) => Promise<LabelsData>,
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

  getViewportBounds(): Rect {
    return this._viewer.viewport.getBounds(true);
  }

  destroy(): void {
    this._viewer.destroy();
    this._tiledImageStates.length = 0;
  }

  private _cleanTiledImages(
    layerMap: Map<string, Layer>,
    imageMap: Map<string, Image>,
    labelsMap: Map<string, Labels>,
  ): void {
    for (let i = 0; i < this._tiledImageStates.length; i++) {
      const tiledImageState = this._tiledImageStates[i]!;
      const keepTiledImage =
        "image" in tiledImageState
          ? imageMap.has(tiledImageState.image.id) &&
            tiledImageState.image.layerConfigs.includes(
              tiledImageState.rawLayerConfig,
            ) &&
            layerMap.has(tiledImageState.rawLayerConfig.layerId)
          : labelsMap.has(tiledImageState.labels.id) &&
            tiledImageState.labels.layerConfigs.includes(
              tiledImageState.rawLayerConfig,
            ) &&
            layerMap.has(tiledImageState.rawLayerConfig.layerId);
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
    layerMap: Map<string, Layer>,
    imageMap: Map<string, Image>,
    labelsMap: Map<string, Labels>,
    loadImage: (image: Image, signal?: AbortSignal) => Promise<ImageData>,
    loadLabels: (labels: Labels, signal?: AbortSignal) => Promise<LabelsData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    let desiredIndex = 0;
    for (const layer of layerMap.values()) {
      for (const image of imageMap.values()) {
        for (const rawLayerConfig of image.layerConfigs.filter(
          (rawLayerConfig) => rawLayerConfig.layerId === layer.id,
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
                tiledImageState.rawLayerConfig === rawLayerConfig,
            );
            const layerConfig = createImageLayerConfig(rawLayerConfig);
            this._createOrUpdateTiledImage(
              layer,
              image,
              layerConfig,
              currentIndex,
              desiredIndex,
              () => imageData.getTileSource(),
              () => ({ image: image, rawLayerConfig: rawLayerConfig }),
            );
            desiredIndex++;
          }
        }
      }
      for (const labels of labelsMap.values()) {
        for (const rawLayerConfig of labels.layerConfigs.filter(
          (rawLayerConfig) => rawLayerConfig.layerId === layer.id,
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
                tiledImageState.rawLayerConfig === rawLayerConfig,
            );
            const layerConfig = createLabelsLayerConfig(rawLayerConfig);
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
              () => ({ labels: labels, rawLayerConfig: rawLayerConfig }),
            );
            desiredIndex++;
          }
        }
      }
    }
  }

  private _createOrUpdateTiledImage(
    layer: Layer,
    object: Image,
    layerConfig: ImageLayerConfig,
    currentIndex: number,
    desiredIndex: number,
    createTileSource: () => string | TileSourceConfig | CustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void;
  private _createOrUpdateTiledImage(
    layer: Layer,
    object: Labels,
    layerConfig: LabelsLayerConfig,
    currentIndex: number,
    desiredIndex: number,
    createTileSource: () => string | TileSourceConfig | CustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void;
  private _createOrUpdateTiledImage(
    layer: Layer,
    object: Image | Labels,
    layerConfig: ImageLayerConfig | LabelsLayerConfig,
    currentIndex: number,
    desiredIndex: number,
    createTileSource: () => string | TileSourceConfig | CustomTileSource,
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
    layer: Layer,
    object: Image,
    layerConfig: ImageLayerConfig,
    createTileSource: () => string | TileSourceConfig | CustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void;
  private _createTiledImage(
    index: number,
    layer: Layer,
    object: Labels,
    layerConfig: LabelsLayerConfig,
    createTileSource: () => string | TileSourceConfig | CustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void;
  private _createTiledImage(
    index: number,
    layer: Layer,
    object: Image | Labels,
    layerConfig: ImageLayerConfig | LabelsLayerConfig,
    createTileSource: () => string | TileSourceConfig | CustomTileSource,
    createTiledImageState: () => TiledImageState,
  ): void {
    const newTiledImageState = createTiledImageState();
    this._viewer.addTiledImage({
      tileSource: createTileSource(),
      index: index,
      // https://github.com/openseadragon/openseadragon/issues/2765
      // flipped: layerConfig.flip ?? layerConfigDefaults.flip,
      opacity: OpenSeadragonController._calculateOpacity(layer, object),
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
            object,
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
    layer: Layer,
    object: Image,
    layerConfig: ImageLayerConfig,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void;
  private _updateTiledImage(
    layer: Layer,
    object: Labels,
    layerConfig: LabelsLayerConfig,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void;
  private _updateTiledImage(
    layer: Layer,
    object: Image | Labels,
    layerConfig: ImageLayerConfig | LabelsLayerConfig,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    if (tiledImage.getFlip() !== layerConfig.flip) {
      tiledImage.setFlip(layerConfig.flip);
    }
    const opacity = OpenSeadragonController._calculateOpacity(layer, object);
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
    layer: Layer,
    layerConfig: ImageLayerConfig,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void;
  private _updateTiledImageTransform(
    layer: Layer,
    layerConfig: LabelsLayerConfig,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void;
  private _updateTiledImageTransform(
    layer: Layer,
    layerConfig: ImageLayerConfig | LabelsLayerConfig,
    tiledImage: TiledImage,
    tiledImageState: TiledImageState,
  ): void {
    const m = mat3.create();
    const dataToLayerMatrix = TransformUtils.toMatrix(layerConfig.transform, {
      x: tiledImageState.imageWidth! / 2,
      y: tiledImageState.imageHeight! / 2,
    });
    mat3.multiply(m, dataToLayerMatrix, m);
    const layerToWorldMatrix = TransformUtils.toMatrix(layer.transform);
    mat3.multiply(m, layerToWorldMatrix, m);
    const dataToWorldTransform = TransformUtils.fromMatrix(m);
    const bounds = tiledImage.getBounds();
    if (tiledImage.getFlip() !== layerConfig.flip) {
      tiledImage.setFlip(layerConfig.flip);
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

  private static _calculateOpacity(layer: Layer, object: Image): number;
  private static _calculateOpacity(layer: Layer, object: Labels): number;
  private static _calculateOpacity(
    layer: Layer,
    object: Image | Labels,
  ): number {
    const visibility = layer.visibility && object.visibility;
    const opacity = layer.opacity * object.opacity;
    return visibility ? opacity : 0;
  }
}

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
