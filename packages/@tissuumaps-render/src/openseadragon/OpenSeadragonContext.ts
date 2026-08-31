import OpenSeadragon from "openseadragon";

import {
  type Dims,
  GeometryUtils,
  type OpenSeadragonViewerOptions,
  type Rect,
} from "@tissuumaps/core";

import { OpenSeadragonUtils } from "./OpenSeadragonUtils";

/**
 * A wrapper around an OpenSeadragon viewer
 *
 * In addition to creating and destroying the viewer, this class manages viewer
 * options (including temporary overrides while the viewer is animating) and
 * mutations of the viewer's world.
 *
 * Additions are split in two: tile sources are opened concurrently, but the
 * world itself is mutated one operation at a time. World indices are shared
 * mutable state that every addition and removal invalidates, and OpenSeadragon
 * applies the `index` option only once an addition is committed - a microtask or
 * more after it was requested - so an index is valid only while nothing else
 * touches the world in between. Removals therefore go through the same queue as
 * additions, rather than being applied right away. Reordering the world
 * afterwards is not an alternative: the navigator mirrors index changes
 * positionally and on a timer, and corrupts its own world if it has not caught
 * up yet.
 *
 * Queued world mutations are ordered by request, so a caller that removes tiled
 * images before requesting additions still resolves its indices against the
 * world as it is once those removals have been applied.
 */
export class OpenSeadragonContext {
  readonly viewer: OpenSeadragon.Viewer;
  private _animationMemory?: {
    viewerOptions: Partial<OpenSeadragonViewerOptions>;
    tiledImageViewerOptions: WeakMap<
      OpenSeadragon.TiledImage,
      Partial<OpenSeadragonViewerOptions>
    >;
  };
  private _animationStartHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _animationFinishHandler?: OpenSeadragon.EventHandler<OpenSeadragon.ViewerEvent>;
  private _worldMutationQueue: Promise<unknown> = Promise.resolve();
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
      if (["r", "R", "f"].includes(event.originalEvent.key)) {
        event.preventDefaultAction = true;
      }
    });
  }

  /**
   * Installs OpenSeadragon `animation-start` and `animation-finish` handlers
   *
   * On animation start, the current values of all keys of the start options are
   * saved (for the viewer and for each tiled image having such a property) and
   * the start options are applied. On animation finish, the saved values are
   * restored, overridden by the finish options.
   *
   * Only keys of the start options are saved and restored; keys appearing solely
   * in the finish options are applied without ever being reverted. Likewise, only
   * tiled images present at animation start have their values restored.
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
        tiledImageViewerOptions: new WeakMap(),
      };
      for (const key of Object.keys(viewerAnimationStartOptions)) {
        // @ts-expect-error: dynamic property access
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this._animationMemory.viewerOptions[key] = this.viewer[key];
      }
      for (let i = 0; i < this.viewer.world.getItemCount(); i++) {
        const tiledImage = this.viewer.world.getItemAt(i);
        const tiledImageViewerOptions: Partial<OpenSeadragonViewerOptions> = {};
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
        const tiledImageViewerOptions: Partial<OpenSeadragonViewerOptions> = {
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
   * Returns whether {@link destroy} has been called
   *
   * Turns `true` as soon as destruction starts, i.e. before pending world
   * mutations have settled and before the viewer is actually destroyed. Further
   * additions are rejected and further removals are ignored from that point on.
   */
  isDestroyed(): boolean {
    return this._destroyed;
  }

  /**
   * Returns the currently visible viewport bounds in world coordinates
   *
   * Reflects the current viewport, not the target of an ongoing animation.
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

  /**
   * Returns the size of the viewer container element, in screen-space pixels
   */
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
   * Adds a tiled image to the OpenSeadragon viewer
   *
   * The tile source is opened right away, i.e. concurrently with the tile sources
   * of other additions, but the tiled images are added to the world one after
   * another, in the order in which they were requested. The index is resolved in
   * between, when nothing else can shift the world anymore.
   *
   * The tile source may also be a promise of an already opened tile source,
   * which is only awaited once the addition is executed. Callers can thus derive
   * a tile source from another one that is still being opened, without giving up
   * their place in the queue and thereby their world index.
   *
   * Rejects right away once the context has been destroyed.
   *
   * Aborting before the addition is executed skips it entirely. Later than that,
   * the pending tile source load cannot be canceled anymore: the tiled image is
   * added, immediately removed again, and the returned promise rejects with the
   * signal's reason. Aborting a replacement (`tiledImageOptions.replace`) instead
   * resolves, as the replaced tiled image is already gone by then and removing
   * the new one, too, would leave a gap in the world.
   *
   * @param tiledImageOptions - Options for adding the tiled image, including the tile source
   * @param options - Optional abort signal and index resolver. The latter takes
   * precedence over `tiledImageOptions.index`, and appends the tiled image to the
   * world if it returns `undefined`.
   * @returns A promise that resolves with the added tiled image, or rejects if
   * adding it failed or the operation was aborted
   */
  addTiledImage(
    tiledImageOptions: Omit<
      OpenSeadragon.TileSourceSpecifier,
      "success" | "error"
    >,
    options?: {
      signal?: AbortSignal;
      getIndex?: () => number | undefined;
    },
  ): Promise<OpenSeadragon.TiledImage> {
    if (this._destroyed) {
      return Promise.reject(
        new Error("The OpenSeadragon context has been destroyed"),
      );
    }
    const { signal, getIndex } = options ?? {};
    const tileSourcePromise = this.openTileSource(tiledImageOptions, {
      signal,
    });
    tileSourcePromise.catch(() => {}); // prevent unhandled rejections in console
    return this._enqueueWorldMutation(async () => {
      signal?.throwIfAborted();
      const tileSource = await tileSourcePromise; // signal passed above
      return this._addTiledImage(
        { ...tiledImageOptions, tileSource },
        { signal, getIndex },
      );
    });
  }

  /**
   * Removes a tiled image from the OpenSeadragon viewer
   *
   * The removal is queued behind the world mutations requested before it, so
   * that it cannot shift the world while an addition is waiting for
   * OpenSeadragon to apply its index. Does nothing once the context has been
   * destroyed, as the viewer tears down its world itself.
   *
   * @param tiledImage - The tiled image to remove
   * @returns A promise that resolves once the tiled image has been removed.
   */
  removeTiledImage(tiledImage: OpenSeadragon.TiledImage): Promise<void> {
    if (this._destroyed) {
      return Promise.resolve();
    }
    return this._enqueueWorldMutation(() =>
      this.viewer.world.removeItem(tiledImage),
    );
  }

  /**
   * Returns the index of a tiled image in the OpenSeadragon viewer's world
   *
   * @param tiledImage - The tiled image for which to get the index
   * @returns The index of the tiled image, or -1 if it is not in the world
   */
  getTiledImageIndex(tiledImage: OpenSeadragon.TiledImage): number {
    return this.viewer.world.getIndexOfItem(tiledImage);
  }

  /**
   * Updates the world bounds spanned by a dummy tiled image and fits the viewport
   * to them
   *
   * A dummy is a fully transparent single-tile image covering `newBounds`. As
   * OpenSeadragon derives the extent of its world from the bounds of its items,
   * such a dummy keeps the world bounds independent of which tiled images are
   * currently loaded, and it doubles as a stable index anchor for renderers.
   *
   * If `dummy` already spans `newBounds`, it is returned unchanged and the
   * viewport is left untouched. Otherwise, a new dummy is created at `dummyIndex`
   * (defaulting to the index of `dummy`, or appended if neither is specified),
   * `dummy` is removed, and the viewport is fitted to `newBounds` - unless the
   * operation was aborted in the meantime, in which case the new dummy is still
   * returned (see below), but the viewport is left where it is. Where
   * possible, OpenSeadragon replaces `dummy` as part of the addition, so that the
   * new dummy takes its place without leaving a gap. Replacing `dummy` cannot be
   * aborted once the new dummy has been created, as that would leave the caller
   * without a dummy.
   *
   * @param newBounds - The new world bounds
   * @param options - Optional abort signal, dummy to replace, and index at which
   * to insert the new dummy
   * @returns A promise that resolves with the new (or the unchanged) dummy
   */
  async updateBounds(
    newBounds: Rect,
    options?: {
      signal?: AbortSignal;
      dummy?: OpenSeadragon.TiledImage;
      dummyIndex?: number;
    },
  ): Promise<OpenSeadragon.TiledImage> {
    const { signal, dummy, dummyIndex } = options ?? {};
    signal?.throwIfAborted();
    if (dummy !== undefined) {
      const { x, y, width, height } = dummy.getBounds();
      if (GeometryUtils.rectEquals({ x, y, width, height }, newBounds)) {
        return dummy;
      }
    }
    let replace = undefined;
    let getIndex = undefined;
    if (dummyIndex === undefined && dummy !== undefined) {
      replace = true;
      getIndex = () => this.viewer.world.getIndexOfItem(dummy);
    }
    const newDummy = await this.addTiledImage(
      {
        index: dummyIndex,
        replace,
        x: newBounds.x,
        y: newBounds.y,
        width: newBounds.width,
        tileSource: OpenSeadragonUtils.createPixelTileSource(
          { width: newBounds.width, height: newBounds.height },
          OpenSeadragonUtils.transparentPixelUrl,
        ),
        opacity: 0,
      },
      { signal, getIndex },
    );
    if (dummy !== undefined && replace !== true) {
      await this.removeTiledImage(dummy);
    }
    if (!signal?.aborted) {
      // TODO only fit bounds if not manually panned/zoomed
      const { x, y, width, height } = newBounds;
      this.viewer.viewport.fitBounds(
        new OpenSeadragon.Rect(x, y, width, height),
      );
    }
    return newDummy;
  }

  /**
   * Destroys the OpenSeadragon viewer and cleans up resources
   *
   * The context is marked as destroyed immediately (see {@link isDestroyed}), but
   * the viewer is only destroyed once no world mutation is pending anymore, as
   * their callbacks would otherwise run against a destroyed viewer. Marking the
   * context as destroyed also stops further world mutations from being enqueued,
   * so awaiting the queue's current tail is enough to drain it.
   */
  async destroy(): Promise<void> {
    this._destroyed = true;
    await this._worldMutationQueue;
    if (!this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
  }

  /**
   * Resolves a tile source specifier to a ready-to-use OpenSeadragon tile source
   *
   * Fetches the image information if the specifier is a URL, awaits promised
   * tile sources, and passes ready tile sources through. Doing this before an
   * addition keeps the loading concurrent, while the additions themselves stay
   * serialized (see {@link addTiledImage}).
   *
   * @param tiledImageOptions - Options containing the tile source to open
   * @param options - Optional abort signal
   * @returns A promise that resolves with the opened tile source
   */
  async openTileSource(
    tiledImageOptions: Omit<
      OpenSeadragon.TileSourceSpecifier,
      "success" | "error"
    >,
    options?: { signal?: AbortSignal },
  ): Promise<OpenSeadragon.TileSource> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    // OpenSeadragon types tile sources as `string | object`, which also covers
    // promises of an already opened tile source; anything else is passed through
    const tileSource = await Promise.resolve(tiledImageOptions.tileSource);
    signal?.throwIfAborted();
    try {
      const { source: openedTileSource } =
        (await this.viewer.instantiateTileSourceClass(
          // this needs to be a shallow copy; OpenSeadragon mutates it!
          { ...tiledImageOptions, tileSource },
        )) as { source: OpenSeadragon.TileSource };
      signal?.throwIfAborted();
      return openedTileSource;
    } catch (error) {
      throw new Error("Failed to open tile source", { cause: error });
    }
  }

  /**
   * Implementation of {@link addTiledImage}, bypassing the world mutation queue
   *
   * Must only be called from within an enqueued world mutation, such that the
   * index resolved by `options.getIndex` is still valid when OpenSeadragon
   * applies it.
   */
  private _addTiledImage(
    tiledImageOptions: Omit<
      OpenSeadragon.TileSourceSpecifier,
      "success" | "error"
    >,
    options?: {
      signal?: AbortSignal;
      getIndex?: () => number | undefined;
    },
  ): Promise<OpenSeadragon.TiledImage> {
    const { signal, getIndex } = options ?? {};
    return new Promise((resolve, reject) =>
      this.viewer.addTiledImage({
        ...tiledImageOptions,
        ...(getIndex !== undefined && { index: getIndex() }),
        success: (event) => {
          const { item: tiledImage } = event as unknown as {
            item: OpenSeadragon.TiledImage;
          };
          if (!signal?.aborted || tiledImageOptions.replace === true) {
            // a replacement cannot be undone, as the replaced tiled image is
            // already gone, so it is kept even if the operation was aborted
            resolve(tiledImage);
          } else {
            // the load could not be canceled, so undo it instead. This runs
            // while the enqueued world mutation is still in flight, so it must
            // not go through the queue, which would deadlock.
            this.viewer.world.removeItem(tiledImage);
            reject(signal.reason as DOMException);
          }
        },
        error: reject,
      }),
    );
  }

  /**
   * Appends a world mutation to the world mutation queue
   *
   * Tasks are run one at a time, in call order, and a failing task does not
   * prevent subsequent tasks from running. Every operation that adds to or
   * removes from the world has to be enqueued here, so that the world cannot
   * shift between an addition resolving its index and OpenSeadragon applying it.
   *
   * @param task - Task to run once all previously enqueued tasks have settled
   * @returns A promise that resolves with the task's result
   */
  private _enqueueWorldMutation<T>(task: () => T | Promise<T>): Promise<T> {
    const result = this._worldMutationQueue.then(task);
    this._worldMutationQueue = result.catch(() => {}); // prevent unhandled rejections in console
    return result;
  }
}
