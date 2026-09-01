---
sidebar_position: 7
---

# Plugins

Once the application has started up, TissUUmaps exposes its plugin registry as
`window.tissuumaps`. Plugins register themselves through the registry:

```javascript
window.tissuumaps.registerPlugin({
  id: "my-plugin",
  name: "My plugin",
  setup: ({ appStore, dataStore, projectStore, settingsStore }) => {},
  teardown: () => {},
});
```

A plugin can be registered at any time, but `window.tissuumaps` only exists once
the application has started up. TissUUmaps signals this by dispatching a
`tissuumaps-loaded` event on `window` at the end of its startup — a plain event
that is not replayed, so a listener added afterwards never fires.

Whether a plugin script runs before or after startup usually cannot be
guaranteed: a classic `<script>` in `index.html` runs before the application's
deferred `<script type="module">`, but an `async` or dynamically imported script
races it. Use the combined pattern, which is correct either way:

```javascript
function registerMyPlugin() {
  window.tissuumaps.registerPlugin({
    id: "my-plugin",
    name: "My plugin",
    setup: ({ appStore, dataStore, projectStore, settingsStore }) => {},
    teardown: () => {},
  });
}

if (window.tissuumaps !== undefined) {
  registerMyPlugin(); // startup already finished
} else {
  window.addEventListener("tissuumaps-loaded", registerMyPlugin, {
    once: true,
  });
}
```

Note that the project is not yet loaded when `tissuumaps-loaded` fires — loading
is only started during startup. A plugin that depends on project contents should
subscribe to `projectStore` in `setup` instead of reading it once.

A plugin is unregistered again — tearing it down — using
`window.tissuumaps.unregisterPlugin(pluginId)`.

## Plugin properties

- `id` (required): a unique identifier for the plugin. Registering a plugin whose
  `id` is already in use unregisters the previous plugin first.
- `name` (required): a human-readable name for the plugin.
- `setup` (required): called once, immediately upon registration, with a reference
  to each of the application's Zustand stores (see below). Errors thrown by
  `setup` are caught and logged; they do not abort application startup. The
  plugin is then not registered, and its `teardown` is _not_ called - a
  `teardown` never has to cope with a half-initialized plugin. A `setup` that can
  fail part-way through is responsible for releasing what it had already set up
  before it rethrows.
- `teardown` (optional): called when the plugin is unregistered, and when the
  application shuts down. Only ever called for a plugin whose `setup` returned
  successfully. Errors thrown by `teardown` are caught and logged.

## Stores

The `setup` function receives the application's four Zustand stores:

| Store           | Contents                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| `appStore`      | Application state: workspace, interaction mode, data providers, plugins      |
| `dataStore`     | Data references (`DataRef`) for the loaded data of each project object       |
| `projectStore`  | The currently loaded project: layers, images, labels, points, shapes, tables |
| `settingsStore` | User settings that are persisted across sessions                             |

Each store is a Zustand store API. Using `appStore` as an example, a plugin can
read the current value of `myProperty` using `appStore.getState().myProperty`,
call the action `myAction` using `appStore.getState().myAction(...)`, and observe
changes using `appStore.subscribe((state, prevState) => {})`.

The stores use the [Immer](https://immerjs.github.io/immer/) middleware, so
`setState` takes a recipe that mutates a draft:

```javascript
appStore.setState((draft) => {
  draft.myProperty = myValue;
});
```

:::caution

The recipe must not return a value. Writing `appStore.setState((draft) => draft.myMap.set(k, v))`
returns the map and makes Immer reject the update — always use a block body.

:::

`dataStore` is derived state: its contents are reconciled from `appStore` and
`projectStore` by the application. Plugins should treat it as read-only and drive
data loading by changing the project instead, for example
`projectStore.getState().updateTable(tableId, { dataSource })`.

## User interface plugins

TODO

## Data provider plugins

TODO
