---
sidebar_position: 4
---

# Plugins

Plugins can register themselves at any time as follows:

```javascript
window.TissUUmapsPlugins ??= []; // ATTENTION: do NOT override this!
window.TissUUmapsPlugins.push({ name: "My plugin", init: (store) => {} });
```

The plugin's `init` function receives a reference to the application's Zustand store. Using this `store` reference, plugins can for example get the current value of `myProperty` using `store.getState().myProperty`, set its value to `myValue` using `store.setState((state) => { state.myProperty = myValue; })`, or call the action `myFunction` using `store.getState().myFunction(...)`.

Optionally, the plugin's `init` function may return a cleanup handler of type `() => void`.
