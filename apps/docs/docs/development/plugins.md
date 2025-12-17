---
sidebar_position: 4
---

# Plugins

The entire Zustand store is exposed to plugins via `window.TissUUmaps`. Plugins can for example get the current value of `myProperty` using `window.TissUUmaps.getState().myProperty`, set its value to `myValue` using `window.TissUUmaps.setState((state) => { state.myProperty = myValue; })`, or call the action `myFunction` using `window.TissUUmaps.getState().myFunction(...)`.

The following global events are available on `window`:

- `tissuumaps-init (eventBus)` issued after the application has been initialized, but before any data is loaded

The following scoped events are available on the `eventBus` provided by the `tissuumaps-init` event:

- `loaded (project)` issued after a project has been loaded (including the initial startup project)
