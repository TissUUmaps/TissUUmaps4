---
sidebar_position: 1
---

# Architecture

This project is structured as a pnpm monorepo as follows:

```
- apps
  - docs  # user and developer documentation
  - tissuumaps  # the TissUUmaps React application
- packages
  - @tissuumaps-core  # the TissUUmaps JavaScript library
  - @tissuumaps-storage  # officially supported data loaders
  - @tissuumaps-plugins  # officially supported TissUUmaps plugins
  - @tissuumaps-viewer  # the TissUUmaps viewer (React component)
```

## @tissuumaps/core

### Model

Models are implemented using a factory pattern. For each `RawModel` there exists a derived `Model` type in which optional fields are replaced by required fields defaulting to `modelDefaults`. A corresponding `createModel()` function can be used to convert a `RawModel` into a `Model`.

Most data model properties can be either a single constant (e.g. a single color uniformly applied to all elements), a reference to a table column holding a value (e.g. a continuous value that is mapped to a color using a color palette) for each element, or a reference to a table column holding a group name for each element, where each group (e.g. cell type) maps to a single value (e.g. color, using a colormap).

### Storage

Data loaders (e.g. a specific table data loader) offer functionality for loading data objects (e.g. a table instance), which can in turn be used to load parts of the required data (e.g. a specific table column). They have a unique `type` and need to be registered in the application state before attempting to load data of that type. All data loader and data object functions starting with `load...` are asynchronous.

### Controllers

The controllers expose the core TissUUmaps functionality as imperative API. Their main responsibility is to synchronize the OpenSeadragon viewer and WebGL shader states with the application state.

The `OpenSeadragonController` tracks the state of `OpenSeadragon.TiledImage` instances currently displayed in the viewer and offers functionality for reconciling ("synchronizing") changes in the application state (layers, images, labels) with the viewer.

The `WebGLController` manages the WebGL context and delegates functionality to the `WebGLPointsController` and `WebGLShapesController` instances associated with the current WebGL context:

- The `WebGLPointsController` loads all point clouds into a single flat GPU buffer (one GPU buffer per point attribute) and tracks the state of the GPU buffer slices and their respective point clouds. It further offers functionality for reconciling ("synchronizing") changes in the points-relevant application state with the GPU buffer slices.
- The `WebGLShapesController` loads individual shape clouds into separate GPU data textures and tracks the state of the GPU data textures and their respective shape clouds. It further offers functionality for reconciling ("synchronizing") changes in the shapes-relevant application state with the GPU data textures.

### Types & utilities

Utilities are exclusively implemented as static classes with corresponding unit tests.

## @tissuumaps/storage

## @tissuumaps/plugins

## @tissuumaps/viewer

The TissUUmaps `Viewer` component uses an adapter pattern facilitated by `ViewerProvider`. It makes use of custom `useOpenSeadragon` and `useWebGL` hooks that encapsulate the `OpenSeadragonController` and the `WebGLController` from `@tissuumaps/core`, respectively (separation of concerns). The WebGL canvas element is appended as a child to the `viewer.canvas` div element (child of the `viewer.container` div element, parent of the `viewer.drawer.canvas` canvas element) to allow for proper compositioning, where `viewer` is the `OpenSeadragon.Viewer` instance.

## Documentation (docs)

The documentation is based on Docusaurus and published to GitHub Pages using GitHub Actions. TypeDoc and typedoc-plugin-docusaurus are used to automatically build the API documentation for packages.

## TissUUmaps (tissuumaps)

### React components

### State management

A single Zustand store is being used, which is distributed over several slices. The main slices are `appSlice` (transient application state), `projectSlice` (persistent project information) and data type-specific slices that hold project data (transient in-memory data and persistent metadata).

### Utilities

Utilities are exclusively implemented as static classes with corresponding unit tests.
