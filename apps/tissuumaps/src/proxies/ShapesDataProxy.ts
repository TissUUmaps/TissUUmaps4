import { useCallback } from "react";

import { type MultiPolygon, type ShapesData } from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";
import { type LoadedShapes } from "../store/shapes";

export class ShapesDataProxy implements ShapesData {
  private readonly _loadedShapes: LoadedShapes;
  private readonly _loadShapesMultiPolygons: (options?: {
    signal?: AbortSignal;
    reload?: boolean;
  }) => Promise<MultiPolygon[]>;

  constructor(
    loadedShapes: LoadedShapes,
    loadShapesMultiPolygons: (options?: {
      signal?: AbortSignal;
      reload?: boolean;
    }) => Promise<MultiPolygon[]>,
  ) {
    this._loadedShapes = loadedShapes;
    this._loadShapesMultiPolygons = loadShapesMultiPolygons;
  }

  getIds(): number[] {
    return this._loadedShapes.data.getIds();
  }

  getSize(): number {
    return this._loadedShapes.data.getSize();
  }

  async loadMultiPolygons(options?: {
    signal?: AbortSignal;
  }): Promise<MultiPolygon[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._loadShapesMultiPolygons({ signal });
  }

  destroy(): void {
    this._loadedShapes.data.destroy();
  }
}

export async function loadShapesDataProxy(
  shapesId: string,
  loadShapes: (
    shapesId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedShapes>,
  loadShapesMultiPolygons: (
    shapesId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<MultiPolygon[]>,
  options?: { signal?: AbortSignal },
) {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const loadedShapes = await loadShapes(shapesId, { signal });
  signal?.throwIfAborted();
  return new ShapesDataProxy(loadedShapes, (options) =>
    loadShapesMultiPolygons(shapesId, options),
  );
}

export function useShapesDataProxy(): ViewerAdapter["loadShapes"] {
  const loadShapes = useTissUUmaps((state) => state.loadShapes);
  const loadShapesMultiPolygons = useTissUUmaps(
    (state) => state.loadShapesMultiPolygons,
  );
  return useCallback(
    (shapesId, options) =>
      loadShapesDataProxy(
        shapesId,
        loadShapes,
        loadShapesMultiPolygons,
        options,
      ),
    [loadShapes, loadShapesMultiPolygons],
  );
}
