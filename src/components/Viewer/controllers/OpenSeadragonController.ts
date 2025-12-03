import { mat3 } from "gl-matrix";
import OpenSeadragon from "openseadragon";

import { ImageData } from "../../../data/image";
import { LabelsData } from "../../../data/labels";
import {
  CompleteImage,
  CompleteImageLayerConfig,
  ImageLayerConfig,
  completeImageLayerConfig,
} from "../../../model/image";
import {
  CompleteLabels,
  CompleteLabelsLayerConfig,
  LabelsLayerConfig,
  completeLabelsLayerConfig,
} from "../../../model/labels";
import { CompleteLayer } from "../../../model/layer";
import { DEFAULT_PROJECT_VIEWER_OPTIONS } from "../../../model/project";
import { ViewerOptions } from "../../../types";
import TransformUtils from "../../../utils/TransformUtils";

export default class OpenSeadragonController {
  private readonly _viewer: OpenSeadragon.Viewer;
  private _tiledImageStates: TiledImageState[] = [];
  private _animationMemory?: {
    viewerValues: Partial<ViewerOptions>;
    tiledImageValues: Map<OpenSeadragon.TiledImage, Partial<ViewerOptions>>;
  };
  private _animationStartHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _animationFinishHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;

  constructor(
    viewerElement: HTMLElement,
    viewerInit?: (viewer: OpenSeadragon.Viewer) => void,
  ) {
    this._viewer = new OpenSeadragon.Viewer({
      ...DEFAULT_PROJECT_VIEWER_OPTIONS,
      // do not forget to exclude properties from the ViewerOptions type when setting them here
      element: viewerElement,
    });
    this._viewer.addHandler("canvas-key", (event) => {
      // disable key bindings for rotation and flipping
      const originalEvent = event.originalEvent as KeyboardEvent;
      if (["r", "R", "f"].includes(originalEvent.key)) {
        event.preventDefaultAction = true;
      }
    });
    if (viewerInit !== undefined) {
      viewerInit(this._viewer);
    }
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
      this._animationMemory = {
        viewerValues: {},
        tiledImageValues: new Map(),
      };
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
        this._animationMemory.tiledImageValues.set(
          tiledImage,
          tiledImageValues,
        );
      }
      this.setViewerOptions(viewerAnimationStartOptions);
    };
    this._animationFinishHandler = () => {
      this.setViewerOptions({
        ...this._animationMemory?.viewerValues,
        ...viewerAnimationFinishOptions,
      });
      for (let i = 0; i < this._viewer.world.getItemCount(); i++) {
        const tiledImage = this._viewer.world.getItemAt(i);
        const tiledImageValues = {
          ...this._animationMemory?.tiledImageValues.get(tiledImage),
          ...viewerAnimationFinishOptions,
        };
        for (const [key, value] of Object.entries(tiledImageValues)) {
          // @ts-expect-error: dynamic property access
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tiledImage[key] = value;
        }
      }
      this._animationMemory = undefined;
    };
    this._viewer.addHandler("animation-start", this._animationStartHandler);
    this._viewer.addHandler("animation-finish", this._animationFinishHandler);
  }

  async synchronize(
    layerMap: Map<string, CompleteLayer>,
    imageMap: Map<string, CompleteImage>,
    labelsMap: Map<string, CompleteLabels>,
    loadImage: (
      image: CompleteImage,
      options: { signal?: AbortSignal },
    ) => Promise<ImageData>,
    loadLabels: (
      labels: CompleteLabels,
      options: { signal?: AbortSignal },
    ) => Promise<LabelsData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    const { signal } = options;
    signal?.throwIfAborted();
    const refs = await this._loadObjects(
      layerMap,
      imageMap,
      labelsMap,
      loadImage,
      loadLabels,
      { signal },
    );
    signal?.throwIfAborted();
    const tiledImageStatesByRef = this._cleanTiledImages(refs);
    this._tiledImageStates = this._createOrUpdateTiledImages(
      refs,
      tiledImageStatesByRef,
    );
  }

  destroy(): void {
    this._viewer.destroy();
    this._tiledImageStates = [];
  }

  private async _loadObjects(
    layerMap: Map<string, CompleteLayer>,
    imageMap: Map<string, CompleteImage>,
    labelsMap: Map<string, CompleteLabels>,
    loadImage: (
      image: CompleteImage,
      options: { signal?: AbortSignal },
    ) => Promise<ImageData>,
    loadLabels: (
      labels: CompleteLabels,
      options: { signal?: AbortSignal },
    ) => Promise<LabelsData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<ObjectRef[]> {
    const { signal } = options;
    signal?.throwIfAborted();
    const refs: ObjectRef[] = [];
    for (const layer of layerMap.values()) {
      for (const image of imageMap.values()) {
        for (const rawLayerConfig of image.layerConfigs.filter(
          (rawLayerConfig) => rawLayerConfig.layerId === layer.id,
        )) {
          let data;
          try {
            data = await loadImage(image, { signal });
          } catch (error) {
            console.error(`Failed to load image with ID '${image.id}'`, error);
          }
          signal?.throwIfAborted();
          if (data !== undefined) {
            refs.push({
              layer: layer,
              image: image,
              rawLayerConfig: rawLayerConfig,
              layerConfig: completeImageLayerConfig(rawLayerConfig),
              data: data,
            });
          }
        }
      }
      for (const labels of labelsMap.values()) {
        for (const rawLayerConfig of labels.layerConfigs.filter(
          (rawLayerConfig) => rawLayerConfig.layerId === layer.id,
        )) {
          let data;
          try {
            data = await loadLabels(labels, { signal });
          } catch (error) {
            console.error(
              `Failed to load labels with ID '${labels.id}'`,
              error,
            );
          }
          signal?.throwIfAborted();
          if (data !== undefined) {
            refs.push({
              layer: layer,
              labels: labels,
              rawLayerConfig: rawLayerConfig,
              layerConfig: completeLabelsLayerConfig(rawLayerConfig),
              data: data,
            });
          }
        }
      }
    }
    return refs;
  }

  private _cleanTiledImages(
    refs: ObjectRef[],
  ): Map<ObjectRef, TiledImageState> {
    const tiledImageStatesByRef = new Map<ObjectRef, TiledImageState>();
    for (let i = 0; i < this._tiledImageStates.length; i++) {
      const tiledImageState = this._tiledImageStates[i]!;
      const ref = refs.find(
        (ref) =>
          ref.layer.id === tiledImageState.ref.layer.id &&
          (("image" in ref &&
            "image" in tiledImageState.ref &&
            ref.image.id === tiledImageState.ref.image.id) ||
            ("labels" in ref &&
              "labels" in tiledImageState.ref &&
              ref.labels.id === tiledImageState.ref.labels.id)) &&
          ref.rawLayerConfig === tiledImageState.ref.rawLayerConfig,
      );
      if (ref !== undefined) {
        tiledImageStatesByRef.set(ref, tiledImageState);
      } else {
        if (tiledImageState.tiledImage !== undefined) {
          this._viewer.world.removeItem(tiledImageState.tiledImage);
        } else {
          tiledImageState.deferredDelete = true;
        }
        this._tiledImageStates.splice(i, 1);
        i--;
      }
    }
    return tiledImageStatesByRef;
  }

  private _createOrUpdateTiledImages(
    refs: ObjectRef[],
    tiledImageStatesByRef: Map<ObjectRef, TiledImageState>,
  ): TiledImageState[] {
    const newTiledImageStates = [];
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i]!;
      let tiledImageState = tiledImageStatesByRef.get(ref);
      if (
        tiledImageState === undefined ||
        tiledImageState.ref.layer.id !== ref.layer.id ||
        !(
          ("image" in ref &&
            "image" in tiledImageState.ref &&
            ref.image.id === tiledImageState.ref.image.id) ||
          ("labels" in ref &&
            "labels" in tiledImageState.ref &&
            ref.labels.id === tiledImageState.ref.labels.id)
        ) ||
        tiledImageState.ref.rawLayerConfig !== ref.rawLayerConfig
      ) {
        tiledImageState = this._createTiledImage(i, ref);
      } else {
        const currentIndex = this._tiledImageStates.indexOf(tiledImageState);
        if (currentIndex !== i) {
          if (tiledImageState.tiledImage !== undefined) {
            this._viewer.world.setItemIndex(tiledImageState.tiledImage, i);
          } else {
            tiledImageState.deferredIndex = i;
          }
        }
        if (tiledImageState.tiledImage !== undefined) {
          this._updateTiledImage(tiledImageState);
        } else {
          tiledImageState.deferredUpdate = true;
        }
      }
      newTiledImageStates.push(tiledImageState);
    }
    return newTiledImageStates;
  }

  private _createTiledImage(index: number, ref: ObjectRef): TiledImageState {
    const tiledImageState: TiledImageState = { ref };
    this._viewer.addTiledImage({
      tileSource:
        "image" in ref
          ? ref.data.getTileSource()
          : (() => {
              // TODO labels tile source
              throw new Error("Method not implemented");
            })(),
      index: index,
      // https://github.com/openseadragon/openseadragon/issues/2765
      // flipped: layerConfig.flip ?? layerConfigDefaults.flip,
      opacity: OpenSeadragonController._calculateOpacity(ref),
      success: (event) => {
        tiledImageState.tiledImage = (
          event as unknown as { item: OpenSeadragon.TiledImage }
        ).item;
        if (
          tiledImageState.deferredIndex !== undefined &&
          tiledImageState.deferredIndex !== index
        ) {
          this._viewer.world.setItemIndex(
            tiledImageState.tiledImage,
            tiledImageState.deferredIndex,
          );
          tiledImageState.deferredIndex = undefined;
        }
        if (tiledImageState.deferredUpdate) {
          this._updateTiledImage(tiledImageState);
          tiledImageState.deferredUpdate = undefined;
        } else {
          // always update transform
          this._updateTiledImageTransform(tiledImageState);
        }
        this._viewer.viewport.fitBounds(
          tiledImageState.tiledImage.getBounds(),
          true,
        );
        if (tiledImageState.deferredDelete) {
          this._viewer.world.removeItem(tiledImageState.tiledImage);
          tiledImageState.deferredDelete = undefined;
        }
      },
    });
    return tiledImageState;
  }

  private _updateTiledImage(tiledImageState: TiledImageState): void {
    if (tiledImageState.tiledImage === undefined) {
      throw new Error("Cannot update tiled image before it is created");
    }
    if (
      tiledImageState.tiledImage.getFlip() !==
      tiledImageState.ref.layerConfig.flip
    ) {
      tiledImageState.tiledImage.setFlip(tiledImageState.ref.layerConfig.flip);
    }
    const opacity = OpenSeadragonController._calculateOpacity(
      tiledImageState.ref,
    );
    if (tiledImageState.tiledImage.getOpacity() !== opacity) {
      tiledImageState.tiledImage.setOpacity(opacity);
    }
    this._updateTiledImageTransform(tiledImageState);
  }

  private _updateTiledImageTransform(tiledImageState: TiledImageState): void {
    if (tiledImageState.tiledImage === undefined) {
      throw new Error("Cannot update tiled image before it is created");
    }
    const m = mat3.create();
    const dataToLayerMatrix = TransformUtils.toMatrix(
      tiledImageState.ref.layerConfig.transform,
      {
        rotationCenter: {
          x: tiledImageState.tiledImage.getContentSize().x / 2,
          y: tiledImageState.tiledImage.getContentSize().y / 2,
        },
      },
    );
    mat3.multiply(m, dataToLayerMatrix, m);
    const layerToWorldMatrix = TransformUtils.toMatrix(
      tiledImageState.ref.layer.transform,
    );
    mat3.multiply(m, layerToWorldMatrix, m);
    const dataToWorldTransform = TransformUtils.fromMatrix(m);
    const bounds = tiledImageState.tiledImage.getBounds();
    if (
      tiledImageState.tiledImage.getFlip() !==
      tiledImageState.ref.layerConfig.flip
    ) {
      tiledImageState.tiledImage.setFlip(tiledImageState.ref.layerConfig.flip);
    }
    const width =
      tiledImageState.tiledImage.getContentSize().x *
      dataToWorldTransform.scale;
    if (bounds.width !== width) {
      tiledImageState.tiledImage.setWidth(width, true); // implicitly updates height to maintain aspect ratio
    }
    const rotation = dataToWorldTransform.rotation;
    if (tiledImageState.tiledImage.getRotation() !== rotation) {
      tiledImageState.tiledImage.setRotation(rotation, true);
    }
    const { x, y } = dataToWorldTransform.translation;
    if (bounds.x !== x || bounds.y !== y) {
      tiledImageState.tiledImage.setPosition(
        new OpenSeadragon.Point(x, y),
        true,
      );
    }
  }

  private static _calculateOpacity(ref: ObjectRef): number {
    const object = "image" in ref ? ref.image : ref.labels;
    const visibility = ref.layer.visibility && object.visibility;
    const opacity = ref.layer.opacity * object.opacity;
    return visibility ? opacity : 0;
  }
}

type ImageRef = {
  layer: CompleteLayer;
  image: CompleteImage;
  rawLayerConfig: ImageLayerConfig;
  layerConfig: CompleteImageLayerConfig;
  data: ImageData;
};

type LabelsRef = {
  layer: CompleteLayer;
  labels: CompleteLabels;
  rawLayerConfig: LabelsLayerConfig;
  layerConfig: CompleteLabelsLayerConfig;
  data: LabelsData;
};

type ObjectRef = ImageRef | LabelsRef;

type TiledImageState = {
  ref: ObjectRef;
  deferredIndex?: number;
  deferredUpdate?: boolean;
  deferredDelete?: boolean;
  tiledImage?: OpenSeadragon.TiledImage;
};

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
