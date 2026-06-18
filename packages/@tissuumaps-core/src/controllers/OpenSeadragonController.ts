import { deepEqual } from "fast-equals";
import { mat3 } from "gl-matrix";
import OpenSeadragon from "openseadragon";

import { defaultViewerOptions } from "../model/constants";
import { type Image } from "../model/image";
import { type Labels } from "../model/labels";
import { type Layer } from "../model/layer";
import { type ViewerOptions } from "../model/types";
import { type ImageData } from "../storage/image";
import { type LabelsData } from "../storage/labels";
import { type Rect } from "../types";
import { TransformUtils } from "../utils/TransformUtils";

/**
 * Controller for managing an OpenSeadragon viewer and its tiled images
 *
 * Handles the lifecycle of tiled images (creation, update, removal) for
 * {@link Image} and {@link Labels} data objects, including transform
 * computation, opacity, and viewer animation options.
 */
export class OpenSeadragonController {
  private static readonly _transparentPixelUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR4AQEFAPr/AAAAAAAABQABZHiVOAAAAABJRU5ErkJggg==";
  public readonly viewer: OpenSeadragon.Viewer;
  private _tiledImageStates: TiledImageState[] = [];
  private _dummyTiledImage?: OpenSeadragon.TiledImage;
  private _animationMemory?: {
    viewerOptions: Partial<ViewerOptions>;
    tiledImageViewerOptions: Map<
      OpenSeadragon.TiledImage,
      Partial<ViewerOptions>
    >;
  };
  private _animationStartHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _animationFinishHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;

  /**
   * @param viewerElement - DOM element in which the OpenSeadragon viewer is created
   */
  constructor(viewerElement: HTMLElement) {
    this.viewer = new OpenSeadragon.Viewer({
      ...structuredClone(defaultViewerOptions),
      // do not forget to exclude properties from the ViewerOptions type when setting them here
      element: viewerElement,
    });
    this.viewer.addHandler("canvas-key", (event) => {
      // disable key bindings for rotation and flipping
      const originalEvent = event.originalEvent as KeyboardEvent;
      if (["r", "R", "f"].includes(originalEvent.key)) {
        event.preventDefaultAction = true;
      }
    });
  }

  /**
   * Applies viewer options to the OpenSeadragon viewer and all existing tiled images
   *
   * For each option key, performs a shallow merge (one level deep) of nested objects
   * on both the viewer instance and every tiled image in the world.
   *
   * @param viewerOptions - Options to apply
   */
  setViewerOptions(viewerOptions: ViewerOptions): void {
    // TODO allow more than one level (deep nested shallow merge)
    for (const [key, value] of Object.entries(viewerOptions)) {
      // @ts-expect-error: dynamic property access
      if (key in this.viewer && this.viewer[key] !== value) {
        // shallow merge of nested objects (first level only)
        if (typeof value === "object" && value !== null) {
          // @ts-expect-error: dynamic property access
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this.viewer[key] = { ...this.viewer[key], ...value };
        } else {
          // @ts-expect-error: dynamic property access
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          this.viewer[key] = value;
        }
      }
      for (let i = 0; i < this.viewer.world.getItemCount(); i++) {
        const tiledImage = this.viewer.world.getItemAt(i);
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

  /**
   * Installs OpenSeadragon `animation-start` and `animation-finish` handlers
   *
   * On animation start, the specified start options are applied and the previous
   * values are saved. On animation finish, the saved values are restored and
   * then merged with the finish options.
   *
   * Calling this method again replaces any previously installed handlers.
   *
   * @param viewerAnimationStartOptions - Options to apply when an animation starts
   * @param viewerAnimationFinishOptions - Options to apply when an animation finishes
   */
  configureAnimationHandlers(
    viewerAnimationStartOptions: ViewerOptions,
    viewerAnimationFinishOptions: ViewerOptions,
  ): void {
    if (this._animationStartHandler !== undefined) {
      this.viewer.removeHandler("animation-start", this._animationStartHandler);
    }
    if (this._animationFinishHandler !== undefined) {
      this.viewer.removeHandler(
        "animation-finish",
        this._animationFinishHandler,
      );
    }
    this._animationStartHandler = () => {
      this._animationMemory = {
        viewerOptions: {},
        tiledImageViewerOptions: new Map(),
      };
      for (const key of Object.keys(viewerAnimationStartOptions)) {
        // @ts-expect-error: dynamic property access
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this._animationMemory.viewerOptions[key] = this.viewer[key];
      }
      for (let i = 0; i < this.viewer.world.getItemCount(); i++) {
        const tiledImage = this.viewer.world.getItemAt(i);
        const tiledImageViewerOptions: Partial<ViewerOptions> = {};
        for (const key of Object.keys(viewerAnimationStartOptions)) {
          if (key in tiledImage) {
            // @ts-expect-error: dynamic property access
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            tiledImageViewerOptions[key] = tiledImage[key];
          }
        }
        this._animationMemory.tiledImageViewerOptions.set(
          tiledImage,
          tiledImageViewerOptions,
        );
      }
      this.setViewerOptions(viewerAnimationStartOptions);
    };
    this._animationFinishHandler = () => {
      this.setViewerOptions({
        ...this._animationMemory?.viewerOptions,
        ...viewerAnimationFinishOptions,
      });
      for (let i = 0; i < this.viewer.world.getItemCount(); i++) {
        const tiledImage = this.viewer.world.getItemAt(i);
        const tiledImageViewerOptions = {
          ...this._animationMemory?.tiledImageViewerOptions.get(tiledImage),
          ...viewerAnimationFinishOptions,
        };
        for (const [key, value] of Object.entries(tiledImageViewerOptions)) {
          // @ts-expect-error: dynamic property access
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tiledImage[key] = value;
        }
      }
      this._animationMemory = undefined;
    };
    this.viewer.addHandler("animation-start", this._animationStartHandler);
    this.viewer.addHandler("animation-finish", this._animationFinishHandler);
  }

  /**
   * Synchronizes the viewer's tiled images with the current model state
   *
   * Loads all images and labels that are assigned to the given layers,
   * removes tiled images that are no longer needed, and creates or updates
   * the remaining ones.
   *
   * @param layers - Layers to render
   * @param images - Image data objects to display
   * @param labels - Labels data objects to display
   * @param getImage - Async getter for image data
   * @param getLabels - Async getter for labels data
   * @param options - Optional abort signal
   */
  async synchronize(
    layers: Layer[],
    images: Image[],
    labels: Labels[],
    getImage: (
      imageId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<ImageData>,
    getLabels: (
      labelsId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<LabelsData>,
    options?: { signal?: AbortSignal; dummyBounds?: Rect | null },
  ): Promise<void> {
    const { signal, dummyBounds = null } = options ?? {};
    signal?.throwIfAborted();
    const refs = await this._loadObjects(
      layers,
      images,
      labels,
      getImage,
      getLabels,
      { signal },
    );
    signal?.throwIfAborted();
    const tiledImageStatesByRef = this._cleanTiledImages(refs);
    this._tiledImageStates = this._createOrUpdateTiledImages(
      refs,
      tiledImageStatesByRef,
    );
    this._updateDummy(dummyBounds);
  }

  /** Destroys the OpenSeadragon viewer and releases all tiled image state */
  destroy(): void {
    this.viewer.destroy();
    this._tiledImageStates = [];
  }

  /**
   * Loads image and labels for every layer, producing a flat list of {@link ObjectRef} entries
   *
   * Objects that fail to load are logged and skipped.
   */
  private async _loadObjects(
    layers: Layer[],
    images: Image[],
    labels: Labels[],
    getImage: (
      imageId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<ImageData>,
    getLabels: (
      labelsId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<LabelsData>,
    options?: { signal?: AbortSignal },
  ): Promise<ObjectRef[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const refs: ObjectRef[] = [];
    for (const layer of layers) {
      for (const currentImage of images.filter((x) => x.layer === layer.id)) {
        let data;
        try {
          data = await getImage(currentImage.id, { signal });
        } catch (error) {
          if (!signal?.aborted) {
            console.error(
              `Failed to load image with ID '${currentImage.id}'`,
              error,
            );
          }
          continue;
        } finally {
          signal?.throwIfAborted();
        }
        refs.push({ layer, image: currentImage, data: data });
      }
      for (const currentLabels of labels.filter((x) => x.layer === layer.id)) {
        let data;
        try {
          data = await getLabels(currentLabels.id, { signal });
        } catch (error) {
          if (!signal?.aborted) {
            console.error(
              `Failed to load labels with ID '${currentLabels.id}'`,
              error,
            );
          }
          continue;
        } finally {
          signal?.throwIfAborted();
        }
        refs.push({ layer, labels: currentLabels, data: data });
      }
    }
    return refs;
  }

  /**
   * Removes tiled images that are no longer referenced
   *
   * Matches existing tiled image states to the new set of refs. States that
   * still map to a ref are returned; states without a matching ref are removed
   * from the viewer world (or scheduled for deferred deletion if the tiled
   * image hasn't loaded yet).
   *
   * @returns Map from matched refs to their existing tiled image states
   */
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
            ref.image.id === tiledImageState.ref.image.id &&
            deepEqual(
              ref.image.dataSource,
              tiledImageState.ref.image.dataSource,
            )) ||
            ("labels" in ref &&
              "labels" in tiledImageState.ref &&
              ref.labels.id === tiledImageState.ref.labels.id &&
              deepEqual(
                ref.labels.dataSource,
                tiledImageState.ref.labels.dataSource,
              ))),
      );
      if (ref !== undefined) {
        tiledImageStatesByRef.set(ref, tiledImageState);
      } else {
        if (tiledImageState.tiledImage !== undefined) {
          this.viewer.world.removeItem(tiledImageState.tiledImage);
        } else {
          tiledImageState.deferredDelete = true;
        }
        this._tiledImageStates.splice(i, 1);
        i--;
      }
    }
    return tiledImageStatesByRef;
  }

  /**
   * Creates new tiled images for refs that have no existing state, or updates
   * (re-positions, re-opacifies) existing ones
   *
   * @param refs - The desired object references in display order
   * @param tiledImageStatesByRef - Existing states that survived {@link _cleanTiledImages}
   * @returns The new ordered list of tiled image states
   */
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
            tiledImageState.ref.image.id === ref.image.id &&
            deepEqual(
              tiledImageState.ref.image.dataSource,
              ref.image.dataSource,
            )) ||
          ("labels" in ref &&
            "labels" in tiledImageState.ref &&
            tiledImageState.ref.labels.id === ref.labels.id &&
            deepEqual(
              tiledImageState.ref.labels.dataSource,
              ref.labels.dataSource,
            ))
        )
      ) {
        tiledImageState = this._createTiledImage(i, ref);
      } else {
        tiledImageState.ref = ref;
        const currentIndex = this._tiledImageStates.indexOf(tiledImageState);
        if (currentIndex !== i) {
          if (tiledImageState.tiledImage !== undefined) {
            this.viewer.world.setItemIndex(tiledImageState.tiledImage, i);
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

  /**
   * Creates a new tiled image in the viewer for the given object reference
   *
   * The tiled image is added asynchronously by OpenSeadragon; the returned
   * state object will have its `tiledImage` field populated once the
   * `success` callback fires, at which point any deferred operations
   * (index, update, delete) are applied.
   *
   * @param index - Desired z-index for the tiled image in the viewer world
   * @param ref - Object reference (image or labels) to render
   */
  private _createTiledImage(index: number, ref: ObjectRef): TiledImageState {
    const tiledImageState: TiledImageState = { ref };
    this.viewer.addTiledImage({
      tileSource:
        "image" in ref
          ? ref.data.getTileSource()
          : (() => {
              // TODO labels tile source
              throw new Error("Method not implemented");
            })(),
      index: index,
      // https://github.com/openseadragon/openseadragon/issues/2765
      // flipped: image.flip / labels.flip,
      opacity: OpenSeadragonController._calculateOpacity(ref),
      success: (event) => {
        const { item: tiledImage } = event as unknown as {
          item: OpenSeadragon.TiledImage;
        };
        tiledImageState.tiledImage = tiledImage;
        if (
          tiledImageState.deferredIndex !== undefined &&
          tiledImageState.deferredIndex !== index
        ) {
          this.viewer.world.setItemIndex(
            tiledImage,
            tiledImageState.deferredIndex,
          );
          tiledImageState.deferredIndex = undefined;
        }
        if (tiledImageState.deferredUpdate) {
          this._updateTiledImage(tiledImageState);
          tiledImageState.deferredUpdate = undefined;
        } else {
          // always update geometry
          this._updateTiledImageGeometry(tiledImageState);
        }
        this.viewer.viewport.fitBounds(tiledImage.getBoundsNoRotate(), true);
        if (tiledImageState.deferredDelete) {
          this.viewer.world.removeItem(tiledImage);
          tiledImageState.deferredDelete = undefined;
        }
      },
    });
    return tiledImageState;
  }

  /**
   * Updates the opacity and geometry of an existing tiled image to match
   * the current model state
   *
   * @throws If the tiled image has not been created yet
   */
  private _updateTiledImage(tiledImageState: TiledImageState): void {
    if (tiledImageState.tiledImage === undefined) {
      throw new Error("Cannot update tiled image before it is created");
    }
    const oldOpacity = tiledImageState.tiledImage.getOpacity();
    const newOpacity = OpenSeadragonController._calculateOpacity(
      tiledImageState.ref,
    );
    if (oldOpacity !== newOpacity) {
      tiledImageState.tiledImage.setOpacity(newOpacity);
      if (oldOpacity === 0 && newOpacity > 0) {
        // OpenSeadragon does not load tiles for invisible images,
        // so we need to trigger a reload when an image becomes visible
        tiledImageState.tiledImage.update(true);
      }
    }
    this._updateTiledImageGeometry(tiledImageState);
  }

  /**
   * Updates the flip, width, rotation, and position of a tiled image based
   * on the composed data → layer → world transform
   *
   * @throws If the tiled image has not been created yet
   */
  private _updateTiledImageGeometry(tiledImageState: TiledImageState): void {
    if (tiledImageState.tiledImage === undefined) {
      throw new Error("Cannot update tiled image before it is created");
    }
    const { flip, transform } =
      "image" in tiledImageState.ref
        ? tiledImageState.ref.image
        : tiledImageState.ref.labels;
    const m = mat3.create();
    const dataToLayerMatrix = TransformUtils.toSimilarityMatrix(transform, {
      center: {
        x: tiledImageState.tiledImage.getContentSize().x / 2,
        y: tiledImageState.tiledImage.getContentSize().y / 2,
      },
    });
    mat3.multiply(m, dataToLayerMatrix, m);
    const layerToWorldMatrix = TransformUtils.toSimilarityMatrix(
      tiledImageState.ref.layer.transform,
    );
    mat3.multiply(m, layerToWorldMatrix, m);
    const dataToWorldTransform = TransformUtils.fromSimilarityMatrix(m);
    const bounds = tiledImageState.tiledImage.getBoundsNoRotate();
    if (tiledImageState.tiledImage.getFlip() !== flip) {
      tiledImageState.tiledImage.setFlip(flip);
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

  private _updateDummy(dummyBounds: Rect | null): void {
    if (dummyBounds !== null && this._dummyTiledImage === undefined) {
      const index = this.viewer.world.getItemCount();
      this.viewer.addTiledImage({
        tileSource: {
          type: "image",
          url: OpenSeadragonController._transparentPixelUrl,
        },
        opacity: 0,
        x: dummyBounds.x,
        y: dummyBounds.y,
        width: dummyBounds.width,
        height: dummyBounds.height,
        success: (event) => {
          // Re-check the live state instead of a value captured before this
          // async callback: only fit to the dummy bounds while no real images
          // are present, otherwise a real image added in the meantime would
          // cause an unexpected viewport jump.
          if (this._tiledImageStates.length > 0) return;
          const { item: tiledImage } = event as unknown as {
            item: OpenSeadragon.TiledImage;
          };
          this.viewer.viewport.fitBounds(tiledImage.getBoundsNoRotate(), true);
        },
      });
      this._dummyTiledImage = this.viewer.world.getItemAt(index);
    } else if (dummyBounds !== null && this._dummyTiledImage !== undefined) {
      this._dummyTiledImage.setPosition(
        new OpenSeadragon.Point(dummyBounds.x, dummyBounds.y),
        true,
      );
      this._dummyTiledImage.setWidth(dummyBounds.width, true);
    } else if (dummyBounds === null && this._dummyTiledImage !== undefined) {
      this.viewer.world.removeItem(this._dummyTiledImage);
      this._dummyTiledImage = undefined;
    }
  }

  /**
   * Computes the effective opacity for a tiled image
   *
   * Returns `0` when either the layer or object is invisible; otherwise
   * multiplies layer and object opacities.
   */
  private static _calculateOpacity(ref: ObjectRef): number {
    const object = "image" in ref ? ref.image : ref.labels;
    const visibility = ref.layer.visibility && object.visibility;
    const opacity = ref.layer.opacity * object.opacity;
    return visibility ? opacity : 0;
  }
}

/** Reference binding an image to a specific layer */
type ImageRef = {
  layer: Layer;
  image: Image;
  data: ImageData;
};

/** Reference binding a labels object to a specific layer */
type LabelsRef = {
  layer: Layer;
  labels: Labels;
  data: LabelsData;
};

/** A reference to either an image or labels object on a specific layer */
type ObjectRef = ImageRef | LabelsRef;

/**
 * Mutable state for a single tiled image in the viewer
 *
 * Because OpenSeadragon adds tiled images asynchronously, the `tiledImage`
 * field may be `undefined` until the `success` callback fires. During that
 * window, operations are deferred via `deferredIndex`, `deferredUpdate`,
 * and `deferredDelete`.
 */
type TiledImageState = {
  /** The object reference that this tiled image represents */
  ref: ObjectRef;
  /** Desired (z-)index to apply once the tiled image is available */
  deferredIndex?: number;
  /** Whether an update is pending until the tiled image is available */
  deferredUpdate?: boolean;
  /** Whether the tiled image should be removed once it becomes available */
  deferredDelete?: boolean;
  /** The OpenSeadragon tiled image, set once the tile source has loaded */
  tiledImage?: OpenSeadragon.TiledImage;
};
