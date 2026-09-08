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
- `setup` (optional): called once, immediately upon registration, with a reference
  to each of the application's Zustand stores (see below). Errors thrown by
  `setup` are caught and logged; they do not abort application startup. The
  plugin is then not registered, and its `teardown` is _not_ called - a
  `teardown` never has to cope with a half-initialized plugin. A `setup` that can
  fail part-way through is responsible for releasing what it had already set up
  before it rethrows. A plugin that only adds a user interface does not need a
  `setup`, because its panel's `mount` receives the same stores.
- `panel` (optional): mounts a user interface panel shown for as long as the
  plugin is registered, see [User interface plugins](#user-interface-plugins).
- `teardown` (optional): called when the plugin is unregistered, and when the
  application shuts down. Only ever called for a plugin that was registered
  successfully, i.e. one whose `setup` did not throw. Errors thrown by `teardown`
  are caught and logged. It is called _before_ the plugin's `panel` is unmounted.

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

A plugin adds a panel to the TissUUmaps user interface by declaring a `panel`.
The panel appears as a tab titled with the plugin's `name`, next to the built-in
Project, Images, Labels, Points, Shapes and Tables panels:

```javascript
window.tissuumaps.registerPlugin({
  id: "my-plugin",
  name: "My plugin",
  panel: (container, { projectStore }) => {
    const paragraph = document.createElement("p");
    const update = (state) => {
      paragraph.textContent = `${state.images.length} images`;
    };
    update(projectStore.getState());
    container.append(paragraph);
    return projectStore.subscribe(update);
  },
});
```

Because `panel` receives the stores itself, a plugin that only adds a user
interface needs neither `setup` nor `teardown`.

`panel` is called with an empty `HTMLElement` owned by the panel, into which the
plugin renders its user interface, and with the same four stores that `setup`
would receive. It may return a callback that unmounts that user interface again.
TissUUmaps empties the container after the callback has run, so the callback only
has to release what is not plain DOM, such as store subscriptions, listeners on
`window`, or a React root.

### Panel lifetime

The panel is shown for exactly as long as the plugin is registered:

- `panel` is called once the plugin's `setup` has returned successfully, if there
  is one, so anything `setup` prepares is available to it.
- The panel stays mounted while other tabs of its group are active — switching
  tabs does not remount it.
- Unregistering the plugin calls `teardown` and then the callback returned by
  `panel`. Because `teardown` runs first, cleaning up the user interface belongs
  in the unmount callback rather than in `teardown`.

:::caution

Closing the panel unregisters the plugin. There is no user interface for adding a
plugin back, so a closed plugin has to be registered again — by reloading the
page, or by calling `registerPlugin` again.

:::

In development, React's [Strict Mode](https://react.dev/reference/react/StrictMode)
deliberately mounts every component twice, so `panel` is called, unmounted and
called again. This is not a bug: it checks that the unmount callback really
undoes everything `panel` did.

### Bringing your own framework

`panel` is a plain DOM contract, so a plugin can use whichever framework it
likes — or none at all. With React, for example:

```javascript
panel: (container, stores) => {
  const element = document.createElement("div");
  container.append(element);
  const root = ReactDOM.createRoot(element);
  root.render(React.createElement(MyPanel, { stores }));
  return () => queueMicrotask(() => root.unmount());
};
```

Note the two details: the root is created on an element of the plugin's own
rather than on `container` itself, and it is unmounted in a microtask.
TissUUmaps unmounts panels from within its own rendering, where unmounting a
React root synchronously makes React warn; deferring it avoids that, and by then
TissUUmaps has emptied `container` — which detaches the plugin's element with the
React root's content intact inside it, rather than pulling that content out from
under React.

:::caution

The registry keeps the plugin object in an Immer store, which deep-freezes it.
Keep mutable plugin state in closures rather than in properties of the plugin
object.

:::
