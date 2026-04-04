---
sidebar_position: 2
---

# Code architecture

This project is structured as a pnpm monorepo as follows:

```
- apps
  - docs                 # User and developer documentation
  - tissuumaps           # The TissUUmaps React application
- packages
  - @tissuumaps-core     # The TissUUmaps JavaScript library
  - @tissuumaps-storage  # Officially supported data providers
  - @tissuumaps-plugins  # Officially supported TissUUmaps plugins
  - @tissuumaps-viewer   # The TissUUmaps viewer (React component)
```

The following diagram outlines the dependency structure among packages and the TissUUmaps application:

```mermaid
flowchart BT
    core["@tissuumaps/core"]

    viewer["@tissuumaps/viewer"]
    viewer --> core

    storage["@tissuumaps/storage"]
    storage --> core

    plugins["@tissuumaps/plugins"]
    plugins --> core

    tissuumaps["TissUUmaps"]
    tissuumaps --> core
    tissuumaps --> storage
    tissuumaps --> plugins
    tissuumaps --> viewer
```

## @tissuumaps/core

### Model

Models are implemented using a factory pattern. For each `RawModel` there exists a derived `Model` type in which optional fields are replaced by required fields defaulting to `modelDefaults`. A corresponding `createModel()` function can be used to convert a `RawModel` into a `Model`.

Most data model properties can be either "simple properties" or of a concrete `Config` type. Concrete `Config` types are union types of one or more of the specific `ConstantConfig` (single uniform value), `FromConfig` (reference to a table column holding values), `GroupByConfig` (reference to a categorical table column holding group names), or `RandomConfig` (pseudo-random value generation) types. The active configuration source can be determined by the shared `source` property of the general `Config` type, or by checking type guards in the order listed here using `getActiveConfigSource`.

### Storage

Data providers (e.g. a specific points data provider) offer functionality for creating data accessors (e.g. for a point cloud), which can be used to access parts of the associated data (e.g. point coordinates for a specific dimension). They have a unique `type` and need to be registered in the application state before attempting to access data of that type. All data accessor functions starting with `load...` are asynchronous.

### Controllers

Controllers expose the core TissUUmaps functionality as imperative API. Their main responsibility is to synchronize the OpenSeadragon viewer and WebGL shader states with a given application state.

The `OpenSeadragonController` tracks the state of `OpenSeadragon.TiledImage` instances currently displayed in the viewer and offers functionality for reconciling ("synchronizing") changes in the application state (layers, images, labels) with the viewer.

The `WebGLController` manages the WebGL context and delegates functionality to the `WebGLPointsController` and `WebGLShapesController` instances associated with the current WebGL context:

- The `WebGLPointsController` loads all point clouds into a single flat GPU buffer (one GPU buffer per point attribute) and tracks the state of the GPU buffer slices and their respective point clouds. It further offers functionality for reconciling ("synchronizing") changes in the points-relevant application state with the GPU buffer slices.
- The `WebGLShapesController` loads individual shape clouds into separate GPU data textures and tracks the state of the GPU data textures and their respective shape clouds. It further offers functionality for reconciling ("synchronizing") changes in the shapes-relevant application state with the GPU data textures.

### Utilities

Utilities are exclusively implemented as static classes.

## @tissuumaps/storage

A data provider implementation consists of a concrete `DataProvider`, whose `open()` method takes a concrete `DataSource` and returns a concrete `Data` accessor.

Each data provider has its own dedicated directory and is separately exported in the `package.json` and `vite.config.ts` files.

## @tissuumaps/plugins

Each plugin has its own dedicated directory and is separately exported in the `package.json` and `vite.config.ts` files.

## @tissuumaps/viewer

The TissUUmaps `Viewer` component uses an adapter pattern facilitated by `ViewerProvider`. It makes use of custom `useOpenSeadragon` and `useWebGL` hooks that encapsulate the `OpenSeadragonController` and the `WebGLController` from `@tissuumaps/core`, respectively (separation of concerns). The WebGL canvas element is appended as a child to the `viewer.canvas` div element (child of the `viewer.container` div element, parent of the `viewer.drawer.canvas` canvas element) to allow for proper compositioning, where `viewer` is the `OpenSeadragon.Viewer` instance.

## TissUUmaps (tissuumaps)

In the TissUUmaps React app, absolute ("@/") imports are preferred over relative parent imports for cross-module imports, while relative imports remain acceptable within a module or feature directory.

### App

Upon startup, all TissUUmaps plugins are initialized and the application state is initialized using a project file loaded from `project.json` (if available) or from the URL given in the `project` GET parameter.

### Hooks

Where possible and useful, React `useEffect` and `useCallback` hooks are enapsulated using custom hooks.

### Components

The user interface is built primarily using TailwindCSS, shadcn/ui, Base UI components, and the Dockview layout manager.

Components are structured as follows:

- `common` - custom low-level components that are commonly reused throughout the codebase
- `jsforms` - JSForms-related components that are used for rendering data source configuration forms
- `panels` - high-level UI building blocks (layout components) that are used as Dockview panels
- `ui` - shadcn/ui components, adapted to the application as needed (be careful when updating!)
- `widgets` - independent high-level components (e.g. configuration widgets) used across panels

### State management

A single Zustand store is being used, which is distributed over several slices. The main slices are `app` (transient application state), `project` (persistent project information) and data type-specific slices that hold project data (transient in-memory data and persistent metadata). Data objects returned by data providers are exposed to the TissUUmaps `Viewer` component using custom data type-specific store adapters. The immer middleware is used to perform immutable updates, with support for Maps and Sets enabled. Asynchronous store actions are deduplicated based on the JSON-stringified function arguments.

## Documentation (docs)

The documentation is based on Docusaurus and published to GitHub Pages using GitHub Actions. TypeDoc and typedoc-plugin-docusaurus are used to automatically build the API documentation for packages. Diagrams are powered by Mermaid.
