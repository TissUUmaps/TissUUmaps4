import { useEffect, useRef } from "react";
import { createStore, useStore } from "zustand";

/** The kinds of data objects a project holds, as used for focus requests */
export type DataObjectKind = "image" | "labels" | "points" | "shapes" | "table";

/** A transient request to reveal a data object in its panel */
type FocusObjectRequest = {
  kind: DataObjectKind;
  objectId: string;
  /** Bumped on every request so repeated clicks re-trigger the reaction */
  nonce: number;
};

/**
 * UI-local store carrying the latest focus request
 *
 * This is deliberately not one of the application stores: a focus request is a
 * transient signal from the notification center to the panels, not state that
 * plugins or persistence should ever see.
 */
const focusObjectStore = createStore<{
  request: FocusObjectRequest | null;
}>()(() => ({ request: null }));

/**
 * Requests that a data object be revealed in its panel
 *
 * @param kind - The kind of the data object
 * @param objectId - The ID of the data object
 */
export function requestFocusObject(
  kind: DataObjectKind,
  objectId: string,
): void {
  focusObjectStore.setState((state) => ({
    request: { kind, objectId, nonce: (state.request?.nonce ?? 0) + 1 },
  }));
}

/**
 * Reacts to focus requests for a given data object kind.
 *
 * Panels use this to expand and reveal an object when its load notification is
 * clicked. The callback fires once per request (tracked via the request nonce),
 * so repeated clicks on the same object re-trigger it.
 */
export function useFocusObject(
  kind: DataObjectKind,
  onFocus: (objectId: string) => void,
): void {
  const request = useStore(focusObjectStore, (state) => state.request);

  // Keep the latest callback in a ref so the trigger effect below only depends
  // on the focus request, not on the (often inline) callback identity.
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  });

  useEffect(() => {
    if (request !== null && request.kind === kind) {
      onFocusRef.current(request.objectId);
    }
  }, [request, kind]);
}
