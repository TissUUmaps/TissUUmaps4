declare global {
  interface WindowEventMap {
    /** Announces that the application has started up */
    "tissuumaps-loaded": Event;
  }
}

/**
 * Announces the end of the application's startup by dispatching the
 * `tissuumaps-loaded` event on `window`
 *
 * The event tells plugins that `window.tissuumaps` is now available. It is a
 * plain event that is not replayed, so a listener added afterwards never fires;
 * plugins therefore have to check for `window.tissuumaps` as well.
 */
export function notifyTissUUmapsLoaded(): void {
  window.dispatchEvent(new Event("tissuumaps-loaded", { cancelable: false }));
}
