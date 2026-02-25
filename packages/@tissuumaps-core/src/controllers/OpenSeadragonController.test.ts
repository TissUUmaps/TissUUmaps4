/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpenSeadragonController } from "./OpenSeadragonController";

// Mock functions and objects need to be created fresh for each test
// These will be set up in beforeEach
let mockTiledImage: any;
let mockWorld: any;
let mockViewport: any;
let mockViewer: any;
let MockOpenSeadragon: any;

// Mock OpenSeadragon module
vi.mock("openseadragon", () => {
  class MockPoint {
    x: number;
    y: number;
    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  }

  return {
    default: {
      Viewer: vi.fn(),
      Point: MockPoint,
    },
  };
});

describe("OpenSeadragonController", () => {
  let viewerElement: HTMLElement;

  beforeEach(async () => {
    // Import the mocked module
    const OpenSeadragon = (await import("openseadragon")).default;
    MockOpenSeadragon = OpenSeadragon;

    // Create fresh mock instances
    mockTiledImage = {
      getOpacity: vi.fn(() => 1),
      setOpacity: vi.fn(),
      getContentSize: vi.fn(() => ({ x: 100, y: 100 })),
      getBounds: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
      getFlip: vi.fn(() => false),
      setFlip: vi.fn(),
      setWidth: vi.fn(),
      getRotation: vi.fn(() => 0),
      setRotation: vi.fn(),
      setPosition: vi.fn(),
    };

    mockWorld = {
      getItemCount: vi.fn(() => 0),
      getItemAt: vi.fn(() => mockTiledImage),
      removeItem: vi.fn(),
      setItemIndex: vi.fn(),
    };

    mockViewport = {
      fitBounds: vi.fn(),
    };

    mockViewer = {
      addHandler: vi.fn(),
      removeHandler: vi.fn(),
      addTiledImage: vi.fn(),
      destroy: vi.fn(),
      world: mockWorld,
      viewport: mockViewport,
    };

    // Update the Viewer mock to return our configured mockViewer
    MockOpenSeadragon.Viewer.mockImplementation(function (this: any) {
      return mockViewer;
    });

    // Create a simple mock element instead of using document.createElement
    viewerElement = { id: "viewer" } as HTMLElement;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("creates an OpenSeadragon viewer with the provided element", () => {
      new OpenSeadragonController(viewerElement);

      expect(MockOpenSeadragon.Viewer).toHaveBeenCalledWith(
        expect.objectContaining({
          element: viewerElement,
        }),
      );
    });

    it("adds canvas-key handler to disable rotation and flip keys", () => {
      new OpenSeadragonController(viewerElement);

      expect(mockViewer.addHandler).toHaveBeenCalledWith(
        "canvas-key",
        expect.any(Function),
      );

      // Test the handler
      const handler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "canvas-key",
      )?.[1];

      // Test key "r" is prevented
      const eventR = {
        originalEvent: { key: "r" },
        preventDefaultAction: false,
      };
      handler(eventR);
      expect(eventR.preventDefaultAction).toBe(true);

      // Test key "R" is prevented
      const eventRCaps = {
        originalEvent: { key: "R" },
        preventDefaultAction: false,
      };
      handler(eventRCaps);
      expect(eventRCaps.preventDefaultAction).toBe(true);

      // Test key "f" is prevented
      const eventF = {
        originalEvent: { key: "f" },
        preventDefaultAction: false,
      };
      handler(eventF);
      expect(eventF.preventDefaultAction).toBe(true);

      // Test other keys are not prevented
      const eventOther = {
        originalEvent: { key: "a" },
        preventDefaultAction: false,
      };
      handler(eventOther);
      expect(eventOther.preventDefaultAction).toBe(false);
    });

    it("calls viewerInit callback with the viewer if provided", () => {
      const viewerInit = vi.fn();

      new OpenSeadragonController(viewerElement, viewerInit);

      expect(viewerInit).toHaveBeenCalledWith(mockViewer);
    });
  });

  describe("setViewerOptions", () => {
    it("sets property on viewer when value differs", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockViewer.testProp = "old";

      controller.setViewerOptions({ testProp: "new" } as any);

      expect(mockViewer.testProp).toBe("new");
    });

    it("sets property on viewer even if reference is same object", () => {
      const controller = new OpenSeadragonController(viewerElement);
      const testObj = { nested: "value" };
      mockViewer.testProp = testObj;
      const newObj = { nested: "updated" };

      controller.setViewerOptions({ testProp: newObj } as any);

      // New object should be assigned (or merged if nested)
      expect(mockViewer.testProp).toEqual(newObj);
    });

    it("shallow merges nested objects on viewer", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockViewer.gestureSettings = { scrollToZoom: false, clickToZoom: true };

      controller.setViewerOptions({
        gestureSettings: { scrollToZoom: true },
      } as any);

      expect(mockViewer.gestureSettings).toEqual({
        scrollToZoom: true,
        clickToZoom: true,
      });
    });

    it("sets property on all tiled images when they exist", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockWorld.getItemCount.mockReturnValue(2);
      const tiledImage1 = { ...mockTiledImage, testProp: "old" };
      const tiledImage2 = { ...mockTiledImage, testProp: "old" };
      mockWorld.getItemAt.mockImplementation((i: number) =>
        i === 0 ? tiledImage1 : tiledImage2,
      );

      controller.setViewerOptions({ testProp: "new" } as any);

      expect(tiledImage1.testProp).toBe("new");
      expect(tiledImage2.testProp).toBe("new");
    });

    it("shallow merges nested objects on tiled images", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockWorld.getItemCount.mockReturnValue(1);
      const tiledImage = {
        ...mockTiledImage,
        compositeOperation: { mode: "source-over", alpha: 0.5 },
      };
      mockWorld.getItemAt.mockReturnValue(tiledImage);

      controller.setViewerOptions({
        compositeOperation: { alpha: 1 },
      } as any);

      expect(tiledImage.compositeOperation).toEqual({
        mode: "source-over",
        alpha: 1,
      });
    });

    it("sets property on tiled images even if they are different objects", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockWorld.getItemCount.mockReturnValue(1);
      const tiledImage = { ...mockTiledImage, testProp: { old: "value" } };
      mockWorld.getItemAt.mockReturnValue(tiledImage);
      const newValue = { new: "value" };

      controller.setViewerOptions({ testProp: newValue } as any);

      // Per docstring: "performs a shallow merge (one level deep)"
      // So { old: "value" } merged with { new: "value" } = { old: "value", new: "value" }
      expect(tiledImage.testProp).toEqual({ old: "value", new: "value" });
    });
  });

  describe("configureAnimationHandlers", () => {
    it("adds animation-start and animation-finish handlers", () => {
      const controller = new OpenSeadragonController(viewerElement);

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 1.0 } as any,
      );

      expect(mockViewer.addHandler).toHaveBeenCalledWith(
        "animation-start",
        expect.any(Function),
      );
      expect(mockViewer.addHandler).toHaveBeenCalledWith(
        "animation-finish",
        expect.any(Function),
      );
    });

    it("removes previous handlers before adding new ones", () => {
      const controller = new OpenSeadragonController(viewerElement);

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 1.0 } as any,
      );

      const startHandler1 = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];

      controller.configureAnimationHandlers(
        { animationTime: 0.3 } as any,
        { animationTime: 0.8 } as any,
      );

      expect(mockViewer.removeHandler).toHaveBeenCalledWith(
        "animation-start",
        startHandler1,
      );
    });

    it("saves viewer state on animation-start", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockViewer.animationTime = 1.0;

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 1.0 } as any,
      );

      const startHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];

      expect(mockViewer.animationTime).toBe(1.0); // Original value before handler
      startHandler(); // Saves original value and applies start options

      // Verify it applies start options
      expect(mockViewer.animationTime).toBe(0.5);
    });

    it("saves tiled image state on animation-start", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockWorld.getItemCount.mockReturnValue(1);
      const tiledImage = { ...mockTiledImage, animationTime: 1.0 };
      mockWorld.getItemAt.mockReturnValue(tiledImage);

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 1.0 } as any,
      );

      const startHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];

      expect(tiledImage.animationTime).toBe(1.0); // Original value before handler
      startHandler(); // Saves original value and applies start options

      expect(tiledImage.animationTime).toBe(0.5);
    });

    it("restores viewer state on animation-finish", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockViewer.animationTime = 1.0;

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 2.0 } as any,
      );

      const startHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];
      const finishHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-finish",
      )?.[1];

      expect(mockViewer.animationTime).toBe(1.0); // Original value
      startHandler(); // Saves animationTime: 1.0, sets to 0.5
      expect(mockViewer.animationTime).toBe(0.5);
      finishHandler(); // Restores saved 1.0, then applies finish option 2.0
      expect(mockViewer.animationTime).toBe(2.0);
    });

    it("saves multiple viewer properties on animation-start", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockViewer.animationTime = 1.5;
      mockViewer.minZoomImageRatio = 0.8;

      controller.configureAnimationHandlers(
        { animationTime: 0.5, minZoomImageRatio: 0.5 } as any,
        { animationTime: 2.0 } as any,
      );

      const startHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];

      expect(mockViewer.animationTime).toBe(1.5); // Original values before handler
      expect(mockViewer.minZoomImageRatio).toBe(0.8);

      startHandler(); // Saves originals and applies start options

      expect(mockViewer.animationTime).toBe(0.5); // Start option applied
      expect(mockViewer.minZoomImageRatio).toBe(0.5); // Start option applied
    });

    it("restores tiled image state on animation-finish", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockWorld.getItemCount.mockReturnValue(1);
      const tiledImage = { ...mockTiledImage, animationTime: 1.0 };
      mockWorld.getItemAt.mockReturnValue(tiledImage);

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 2.0 } as any,
      );

      const startHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];
      const finishHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-finish",
      )?.[1];

      expect(tiledImage.animationTime).toBe(1.0); // Original value
      startHandler(); // Saves original 1.0, sets to 0.5
      expect(tiledImage.animationTime).toBe(0.5);
      finishHandler(); // Restores saved 1.0, then applies finish option 2.0
      expect(tiledImage.animationTime).toBe(2.0);
    });

    it("clears animation memory after finish", () => {
      const controller = new OpenSeadragonController(viewerElement);
      mockViewer.animationTime = 2.0;

      controller.configureAnimationHandlers(
        { animationTime: 0.5 } as any,
        { animationTime: 1.0 } as any,
      );

      const startHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-start",
      )?.[1];
      const finishHandler = mockViewer.addHandler.mock.calls.find(
        (call: any) => call[0] === "animation-finish",
      )?.[1];

      startHandler(); // Saves original 2.0, sets to 0.5
      expect(mockViewer.animationTime).toBe(0.5);

      finishHandler(); // Restores saved 2.0, then applies finish option 1.0
      expect(mockViewer.animationTime).toBe(1.0);

      // Change the value which would have been saved if memory wasn't cleared
      mockViewer.animationTime = 3.0;
      finishHandler(); // Call finish again - memory is undefined, so only finish option applies
      // Should apply the finish option 1.0, not restore 3.0
      expect(mockViewer.animationTime).toBe(1.0);
    });
  });

  describe("synchronize", () => {
    it("loads images and creates tiled images", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const labels: any[] = [];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        labels,
        loadImage,
        loadLabels,
      );

      expect(loadImage).toHaveBeenCalledWith("image1", expect.any(Object));
      expect(mockViewer.addTiledImage).toHaveBeenCalledWith(
        expect.objectContaining({
          tileSource: { type: "image" },
          index: 0,
          opacity: 1,
        }),
      );
    });

    it("handles abort signal during loading", async () => {
      const controller = new OpenSeadragonController(viewerElement);
      const abortController = new AbortController();

      const layers = [{ id: "layer1" }];
      const images = [{ id: "image1", layerConfigs: [{ layer: "layer1" }] }];
      const loadImage = vi.fn();
      const loadLabels = vi.fn();

      // Start abort immediately to ensure it's detected early
      abortController.abort();

      await expect(
        controller.synchronize(
          layers as any,
          images as any,
          [],
          loadImage,
          loadLabels,
          { signal: abortController.signal },
        ),
      ).rejects.toThrow();

      // loadImage should not be called because abort is checked before loading
      expect(loadImage).not.toHaveBeenCalled();
    });

    it("logs error when image fails to load", async () => {
      const controller = new OpenSeadragonController(viewerElement);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => {
        throw new Error("Load failed");
      });
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load image with ID 'image1'",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("removes tiled images not in the new state", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      // First synchronize with one image
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      // Trigger the success callback to create the tiled image
      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = { ...mockTiledImage };
      successCallback({ item: createdTiledImage });

      // Second synchronize with no images
      await controller.synchronize(
        layers as any,
        [],
        [],
        loadImage,
        loadLabels,
      );

      expect(mockWorld.removeItem).toHaveBeenCalledWith(createdTiledImage);
    });

    it("updates existing tiled image opacity when it changes", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 0.5,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = {
        ...mockTiledImage,
        getOpacity: vi.fn(() => 0.5),
      };
      successCallback({ item: createdTiledImage });

      // Change opacity
      images[0]!.opacity = 0.8;

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(createdTiledImage.setOpacity).toHaveBeenCalledWith(0.8);
    });

    it("sets opacity to 0 when layer is invisible", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: false,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(mockViewer.addTiledImage).toHaveBeenCalledWith(
        expect.objectContaining({
          opacity: 0,
        }),
      );
    });

    it("sets opacity to 0 when image is invisible", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: false,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(mockViewer.addTiledImage).toHaveBeenCalledWith(
        expect.objectContaining({
          opacity: 0,
        }),
      );
    });

    it("multiplies layer and image opacity", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 0.5,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 0.8,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(mockViewer.addTiledImage).toHaveBeenCalledWith(
        expect.objectContaining({
          opacity: 0.4, // 0.5 * 0.8
        }),
      );
    });

    it("updates tiled image geometry on success callback", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 10, y: 20 }, rotation: 0, scale: 2 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = { ...mockTiledImage };
      successCallback({ item: createdTiledImage });

      expect(createdTiledImage.setWidth).toHaveBeenCalledWith(200, true); // 100 * 2
      expect(createdTiledImage.setPosition).toHaveBeenCalled();
      expect(mockViewport.fitBounds).toHaveBeenCalled();
    });

    it("updates rotation when it changes", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 45, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = { ...mockTiledImage };
      createdTiledImage.getRotation = vi.fn(() => 0); // Different rotation
      successCallback({ item: createdTiledImage });

      expect(createdTiledImage.setRotation).toHaveBeenCalledWith(45, true);
    });

    it("handles deferred delete for tiled images not yet created", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      // First sync adds the tiled image (but success callback hasn't fired yet)
      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      // Second sync removes it before the success callback fires
      await controller.synchronize(
        layers as any,
        [],
        [],
        loadImage,
        loadLabels,
      );

      // Now trigger the success callback
      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = { ...mockTiledImage };
      successCallback({ item: createdTiledImage });

      // Should be deleted immediately after creation
      expect(mockWorld.removeItem).toHaveBeenCalledWith(createdTiledImage);
    });

    it("skips layers not matching layer config", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer2",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1", // Different layer
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn();
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(loadImage).not.toHaveBeenCalled();
      expect(mockViewer.addTiledImage).not.toHaveBeenCalled();
    });

    it("handles multiple layer configs for the same image", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
            {
              layer: "layer1",
              transform: {
                translation: { x: 10, y: 10 },
                rotation: 0,
                scale: 2,
              },
              flip: true,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      expect(loadImage).toHaveBeenCalledTimes(2);
      expect(mockViewer.addTiledImage).toHaveBeenCalledTimes(2);
    });

    it("sets tiled image index on success callback", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const call = mockViewer.addTiledImage.mock.calls[0]?.[0];
      expect(call.index).toBe(0);
    });

    it("handles flip in layer config", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: true,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = {
        ...mockTiledImage,
        getFlip: vi.fn(() => false),
      };
      successCallback({ item: createdTiledImage });

      expect(createdTiledImage.setFlip).toHaveBeenCalledWith(true);
    });

    it("does not update flip when already set correctly", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const createdTiledImage = {
        ...mockTiledImage,
        getFlip: vi.fn(() => false),
      };
      successCallback({ item: createdTiledImage });

      expect(createdTiledImage.setFlip).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("destroys the OpenSeadragon viewer", () => {
      const controller = new OpenSeadragonController(viewerElement);

      controller.destroy();

      expect(mockViewer.destroy).toHaveBeenCalled();
    });

    it("clears tiled image states", () => {
      const controller = new OpenSeadragonController(viewerElement);

      controller.destroy();

      // Internal state should be cleared - can't test directly but verify no errors
      expect(() => controller.destroy()).not.toThrow();
    });
  });

  describe("deferred index reordering", () => {
    it("sets item index when deferredIndex is different from current index", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      // Add first tiled image
      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const tiledImage = { ...mockTiledImage };
      successCallback({ item: tiledImage });

      // Change layer order to trigger deferred reordering
      const newLayers = [
        {
          id: "layer2",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];

      const newImages = [
        {
          id: "image2",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer2",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];

      // Sync with new order
      await controller.synchronize(
        newLayers as any,
        newImages as any,
        [],
        loadImage,
        loadLabels,
      );

      // Simulate success of first new image to trigger deferred reordering
      const newSuccessCallback =
        mockViewer.addTiledImage.mock.calls[1]?.[0].success;
      const newTiledImage = { ...mockTiledImage };
      newSuccessCallback({ item: newTiledImage });

      // Trigger success of second image (first image) with different index
      const oldImageCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      oldImageCallback({ item: tiledImage });

      expect(mockWorld.setItemIndex).toHaveBeenCalledWith(tiledImage, 1);
    });
  });

  describe("deferred update vs geometry-only update", () => {
    it("performs full update when deferredUpdate flag is set", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 0.5,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 0.8,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const tiledImage = { ...mockTiledImage };
      successCallback({ item: tiledImage });

      // Change opacity to trigger update
      images[0]!.opacity = 0.2;

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      // The success callback is called again with deferred update
      successCallback({ item: tiledImage });

      // Should have called setOpacity (full update)
      expect(tiledImage.setOpacity).toHaveBeenCalled();
    });

    it("performs geometry-only update when deferredUpdate is false", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 45, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 1,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const tiledImage = {
        ...mockTiledImage,
        getRotation: vi.fn(() => 0),
      };
      successCallback({ item: tiledImage });

      // Change geometry only (rotation) by changing layer transform, not calling synchronize
      // This tests the else branch in the success callback where only geometry is updated
      expect(tiledImage.setRotation).toHaveBeenCalled();
    });
  });

  describe("opacity state comparison", () => {
    it("skips opacity update when opacity has not changed", async () => {
      const controller = new OpenSeadragonController(viewerElement);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const images = [
        {
          id: "image1",
          visibility: true,
          opacity: 0.5,
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadImage = vi.fn(async () => ({
        getTileSource: () => ({ type: "image" }),
        destroy: vi.fn(),
      }));
      const loadLabels = vi.fn();

      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      const successCallback =
        mockViewer.addTiledImage.mock.calls[0]?.[0].success;
      const tiledImage = {
        ...mockTiledImage,
        getOpacity: vi.fn(() => 0.5), // Already at current opacity
      };
      successCallback({ item: tiledImage });

      // Update something else that doesn't change opacity
      await controller.synchronize(
        layers as any,
        images as any,
        [],
        loadImage,
        loadLabels,
      );

      successCallback({ item: tiledImage });

      // setOpacity should only be called on initial sync, not on second (when opacity hasn't changed)
      expect(tiledImage.setOpacity).not.toHaveBeenCalledTimes(2);
    });
  });
});
