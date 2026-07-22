import OpenSeadragon from "openseadragon";

import { type Dims, GeometryUtils, type Rect } from "@tissuumaps/core";

import type { OpenSeadragonViewerOptions } from "./OpenSeadragonOptions";

const transparentPixelUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR4AQEFAPr/AAAAAAAABQABZHiVOAAAAABJRU5ErkJggg==";

/**
 * A wrapper around an OpenSeadragon viewer that provides additional functionality
 * for managing viewer options and animation handlers.
 */
export class OpenSeadragonContext {
  readonly viewer: OpenSeadragon.Viewer;
  private _animationMemory?: {
    viewerOptions: Partial<OpenSeadragon.Options>;
    tiledImageViewerOptions: Map<
      OpenSeadragon.TiledImage,
      Partial<OpenSeadragon.Options>
    >;
  };
  private _animationStartHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _animationFinishHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _itemsMutationPromise: Promise<unknown> = Promise.resolve();
  private _destroyed: boolean = false;

  /**
   * Creates a new OpenSeadragonContext instance and initializes the OpenSeadragon viewer
   *
   * @param viewerElement - DOM element in which the OpenSeadragon viewer is created
   * @param viewerOptions - Options for configuring the OpenSeadragon viewer (optional)
   */
  constructor(
    viewerElement: HTMLElement,
    viewerOptions?: OpenSeadragonViewerOptions,
  ) {
    this.viewer = new OpenSeadragon.Viewer({
      ...viewerOptions,
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
    viewerAnimationStartOptions: OpenSeadragonViewerOptions,
    viewerAnimationFinishOptions: OpenSeadragonViewerOptions,
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
        const tiledImageViewerOptions: Partial<OpenSeadragon.Options> = {};
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
      this._applyViewerOptions(viewerAnimationStartOptions);
    };
    this._animationFinishHandler = () => {
      this._applyViewerOptions({
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
          tiledImage[key] = value;
        }
      }
      this._animationMemory = undefined;
    };
    this.viewer.addHandler("animation-start", this._animationStartHandler);
    this.viewer.addHandler("animation-finish", this._animationFinishHandler);
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  /**
   * Returns the current viewport bounds in viewer coordinates
   *
   * @returns The current viewport bounds in viewer coordinates
   */
  getViewport(): Rect {
    const viewport = this.viewer.viewport.getBounds(true);
    return {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height,
    };
  }

  getContainerSize(): Dims {
    const { x, y } = this.viewer.viewport.getContainerSize();
    return { width: x, height: y };
  }

  /**
   * Applies viewer options to the OpenSeadragon viewer and all existing tiled images
   *
   * For each option key, performs a shallow merge (one level deep) of nested objects
   * on both the viewer instance and every tiled image in the world.
   *
   * @param viewerOptions - Options to apply
   */
  setViewerOptions(viewerOptions: OpenSeadragonViewerOptions): void {
    this._applyViewerOptions(viewerOptions);
  }

  /**
   * Adds a tiled image to the OpenSeadragon viewer and returns a promise that resolves
   * with the added tiled image once it has been successfully added.
   *
   * The promise will reject if the OpenSeadragon viewer has been destroyed or if an error occurs while adding the tiled image.
   * The promise is also tracked internally to ensure that the viewer is not destroyed while there are pending promises.
   *
   * The `success` and `error` callbacks in the `options` parameter will be called before the promise resolves or rejects, respectively.
   * If an error occurs in these callbacks, the promise will reject with that error.
   *
   * @param tiledImageOptions - Options for adding the tiled image, including the tile source and optional callbacks
   * @returns A promise that resolves with the added tiled image or rejects with an error
   * @throws Error if the OpenSeadragon viewer has been destroyed
   */
  async addTiledImage(
    tiledImageOptions: Omit<
      OpenSeadragon.TileSourceSpecifier,
      "success" | "error"
    >,
  ): Promise<OpenSeadragon.TiledImage> {
    return this._enqueueItemsMutation(async () =>
      this._addTiledImage(tiledImageOptions),
    );
  }

  async removeTiledImage(tiledImage: OpenSeadragon.TiledImage): Promise<void> {
    return this._enqueueItemsMutation(() =>
      this.viewer.world.removeItem(tiledImage),
    );
  }

  async getTiledImageIndex(
    tiledImage: OpenSeadragon.TiledImage,
  ): Promise<number> {
    return this._enqueueItemsMutation(() => {
      return this.viewer.world.getIndexOfItem(tiledImage);
    });
  }

  async updateBounds(
    newBounds: Rect,
    options?: {
      dummy?: OpenSeadragon.TiledImage;
      dummyIndex?: number;
    },
  ): Promise<OpenSeadragon.TiledImage> {
    const { dummy, dummyIndex } = options ?? {};
    return this._enqueueItemsMutation(async () => {
      if (dummy !== undefined) {
        const { x, y, width, height } = dummy.getBounds();
        if (GeometryUtils.rectEquals({ x, y, width, height }, newBounds)) {
          return dummy;
        }
      }
      const newDummy = await this._addTiledImage({
        index:
          dummyIndex === undefined && dummy !== undefined
            ? this.viewer.world.getIndexOfItem(dummy)
            : dummyIndex,
        x: newBounds.x,
        y: newBounds.y,
        width: newBounds.width,
        tileSource: {
          width: newBounds.width,
          height: newBounds.height,
          tileSize: Math.max(newBounds.width, newBounds.height),
          minLevel: 0,
          maxLevel: 0,
          getTileUrl: () => transparentPixelUrl,
        },
        opacity: 0,
      });
      if (dummy !== undefined) {
        this.viewer.world.removeItem(dummy);
      }
      // TODO only fit bounds if not manually panned/zoomed
      const { x, y, width, height } = newBounds;
      this.viewer.viewport.fitBounds(
        new OpenSeadragon.Rect(x, y, width, height),
      );
      return newDummy;
    });
  }

  /**
   * Destroys the OpenSeadragon viewer and cleans up resources
   */
  async destroy(): Promise<void> {
    this._destroyed = true;
    await this._itemsMutationPromise;
    if (!this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
  }

  /**
   * Applies viewer options to the OpenSeadragon viewer and all existing tiled images
   *
   * For each option key, performs a shallow merge (one level deep) of nested objects
   * on both the viewer instance and every tiled image in the world.
   *
   * @param viewerOptions - Options to apply
   */
  private _applyViewerOptions(viewerOptions: OpenSeadragon.Options): void {
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

  private async _addTiledImage(
    tiledImageOptions: Omit<
      OpenSeadragon.TileSourceSpecifier,
      "success" | "error"
    >,
  ): Promise<OpenSeadragon.TiledImage> {
    return new Promise((resolve, reject) => {
      this.viewer.addTiledImage({
        ...tiledImageOptions,
        success: (event) => {
          const { item: tiledImage } = event as unknown as {
            item: OpenSeadragon.TiledImage;
          };
          resolve(tiledImage);
        },
        error: reject,
      });
    });
  }

  private async _enqueueItemsMutation<T>(
    task: () => T | Promise<T>,
  ): Promise<T> {
    const result = this._itemsMutationPromise.then(task);
    this._itemsMutationPromise = result.catch(() => {});
    return result;
  }
}
