---
sidebar_position: 3
---

# Components

React components are grouped in barrels. In most cases, calls to React hooks are abstracted into custom hooks.

## Viewer

The `Viewer` component uses a conventional "controller" pattern to interact with imperative APIs. The viewer utilizes the `OpenSeadragonController` and the `WebGLController` classes, which are disentangled by custom `useOpenSeadragon` and `useWebGL` hooks (separation of concerns). The WebGL canvas element is appended as a child to the `viewer.canvas` div element (child of the `viewer.container` div element, parent of the `viewer.drawer.canvas` canvas element) to allow for proper compositioning, where `viewer` is the `OpenSeadragon.Viewer` instance.

The `OpenSeadragonController` tracks the state of `OpenSeadragon.TiledImage` instances currently displayed in the viewer and offers functionality for reconciling ("synchronizing") changes in the application state (layers, images, labels) with the viewer.

The `WebGLController` manages the WebGL context and delegates functionality to the `WebGLPointsController` and `WebGLShapesController` instances associated with the current WebGL context:

- The `WebGLPointsController` loads all point clouds into a single flat GPU buffer (one GPU buffer per coordinate/property) and tracks the state of the GPU buffer slices and their respective point clouds. It further offers functionality for reconciling ("synchronizing") changes in the points-relevant application state with the GPU buffer slices.
- The `WebGLShapesController` loads individual shape clouds into separate GPU data textures and tracks the state of the GPU data textures and their respective shape clouds. It further offers functionality for reconciling ("synchronizing") changes in the shapes-relevant application state with the GPU data textures.
