import { useCallback, useEffect, useRef, useState } from "react";

import type { Rect } from "@tissuumaps/core";
import {
  OpenSeadragonContext,
  OpenSeadragonImageRenderer,
  OpenSeadragonLabelsRenderer,
} from "@tissuumaps/render";

import type { ViewerAdapter } from "../adapter";

type OS = {
  viewerElement: HTMLDivElement;
  context: OpenSeadragonContext;
  imageRenderer: OpenSeadragonImageRenderer;
  labelsRenderer: OpenSeadragonLabelsRenderer;
};

export function useOpenSeadragon(adapter: ViewerAdapter) {
  const {
    workspace,
    layers,
    images,
    labels,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    osOptions,
    loadImage,
    loadLabels,
    loadTable,
  } = adapter;

  const osRef = useRef<OS | null>(null);
  const osPromiseRef = useRef<Promise<OS | null>>(Promise.resolve(null));
  const [osReady, setOSReady] = useState(false);

  const osOptionsRef = useRef(osOptions);

  const initOS = useCallback((viewerElementOrNull: HTMLDivElement | null) => {
    if (viewerElementOrNull === null) {
      return () => {};
    }
    const abortController = new AbortController();
    const viewerElement = viewerElementOrNull;

    async function startOS() {
      abortController.signal.throwIfAborted();
      const context = new OpenSeadragonContext(
        viewerElement,
        osOptionsRef.current.viewerOptions,
      );
      let imageRenderer: OpenSeadragonImageRenderer | undefined;
      try {
        imageRenderer = await new Promise<OpenSeadragonImageRenderer>(
          (resolve, reject) => {
            try {
              const imageRenderer = new OpenSeadragonImageRenderer(
                context,
                () => resolve(imageRenderer),
                reject,
                { anchorIndex: 0, signal: abortController.signal },
              );
            } catch (error) {
              reject(
                new Error("Error creating image renderer", { cause: error }),
              );
            }
          },
        );
        abortController.signal.throwIfAborted();
      } catch (error) {
        if (imageRenderer !== undefined) {
          await imageRenderer.destroy();
        }
        await context.destroy();
        throw error;
      }
      let labelsRenderer: OpenSeadragonLabelsRenderer | undefined;
      try {
        labelsRenderer = await new Promise<OpenSeadragonLabelsRenderer>(
          (resolve, reject) => {
            try {
              const labelsRenderer = new OpenSeadragonLabelsRenderer(
                context,
                () => resolve(labelsRenderer),
                reject,
                { anchorIndex: 1, signal: abortController.signal },
              );
            } catch (error) {
              reject(
                new Error("Error creating labels renderer", { cause: error }),
              );
            }
          },
        );
        abortController.signal.throwIfAborted();
      } catch (error) {
        if (imageRenderer !== undefined) {
          await imageRenderer.destroy();
        }
        if (labelsRenderer !== undefined) {
          await labelsRenderer.destroy();
        }
        await context.destroy();
        throw error;
      }
      const os = { viewerElement, context, imageRenderer, labelsRenderer };
      osRef.current = os;
      setOSReady(true);
      return os;
    }

    async function stopOS() {
      const os = osRef.current;
      setOSReady(false);
      osRef.current = null;
      if (os !== null) {
        const { context, imageRenderer, labelsRenderer } = os;
        await imageRenderer.destroy();
        await labelsRenderer.destroy();
        await context.destroy();
      }
    }

    osPromiseRef.current = osPromiseRef.current.then(startOS).catch((error) => {
      if (!abortController.signal.aborted) {
        console.error("Error starting OpenSeadragon", error);
      }
      return null;
    });
    return () => {
      abortController.abort();
      osPromiseRef.current = osPromiseRef.current
        .then(async () => {
          await stopOS();
          return null;
        })
        .catch((error) => {
          console.error("Error stopping OpenSeadragon", error);
          return null;
        });
    };
  }, []);

  useEffect(() => {
    osOptionsRef.current = osOptions;
    if (osReady && osRef.current !== null) {
      osRef.current.context.setViewerOptions(osOptions.viewerOptions);
      osRef.current.context.configureAnimationHandlers(
        osOptions.viewerAnimationStartOptions,
        osOptions.viewerAnimationFinishOptions,
      );
    }
  }, [osReady, osOptions]);

  useEffect(() => {
    const abortController = new AbortController();
    if (osReady && osRef.current !== null) {
      osRef.current.imageRenderer
        .synchronize(layers, images, loadImage, {
          signal: abortController.signal,
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error synchronizing OpenSeadragon images", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [osReady, workspace, layers, images, loadImage]);

  useEffect(() => {
    const abortController = new AbortController();
    if (osReady && osRef.current !== null) {
      osRef.current.labelsRenderer
        .synchronize(
          layers,
          labels,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadLabels,
          loadTable,
          { signal: abortController.signal },
        )
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error synchronizing OpenSeadragon labels", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [
    osReady,
    workspace,
    layers,
    labels,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    loadLabels,
    loadTable,
  ]);

  const updateOSExternalBounds = useCallback(
    (extraBounds: Rect[]) => {
      const abortController = new AbortController();
      if (osReady && osRef.current !== null) {
        osRef.current.imageRenderer.setExtraBounds(extraBounds);
        osRef.current.labelsRenderer.setExtraBounds(extraBounds);
        osRef.current.imageRenderer
          .updateBounds({ signal: abortController.signal })
          .catch((error) => {
            if (!abortController.signal.aborted) {
              console.error(
                "Error updating OpenSeadragon image world bounds",
                error,
              );
            }
          });
        osRef.current.labelsRenderer
          .updateBounds({ signal: abortController.signal })
          .catch((error) => {
            if (!abortController.signal.aborted) {
              console.error(
                "Error updating OpenSeadragon labels world bounds",
                error,
              );
            }
          });
      }
      return () => {
        abortController.abort();
      };
    },
    [osReady],
  );

  return { initOS, osRef, osReady, updateOSExternalBounds };
}
