---
sidebar_position: 5
---

# Plugins

The complete Zustand store is exposed to plugins via `window.tissuumaps`. Plugins can for example query the current state using `window.tissuumaps.getState().myproperty`, call functions using `window.tissuumaps.getState().myfunction(...)`, or update the application state using `window.tissuumaps.setState((state) => { state.myproperty = myvalue; })`.

The following global events are available on `window`:

- `tissuumaps-init (eventBus)` issued after the application has been initialized, but before any data is loaded

The following scoped events are available on the `eventBus` provided by the `tissuumaps-init` event:

- `loaded (project)` issued after a project has been loaded (including the initial startup project)
