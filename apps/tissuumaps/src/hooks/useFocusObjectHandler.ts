import { useEffect, useRef } from "react";

/** The kinds of data objects a project holds, as used for focus requests */
export type DataObjectKind = "image" | "labels" | "points" | "shapes" | "table";

/** Reveals a data object in its panel (e.g. expand and scroll into view) */
type FocusObjectHandler = (objectId: string) => void;

/**
 * The registered focus handlers, one per data object kind
 *
 * This is deliberately not an application store: a focus request is a transient
 * command from the notification center to a panel, not state that plugins or
 * persistence should ever see. Each request is delivered exactly once — either
 * right away, or, if the kind's panel is not mounted yet (dockview unmounts
 * inactive tabs), once its handler registers — so a request can never be
 * replayed by a later remount.
 */
const handlers = new Map<DataObjectKind, FocusObjectHandler>();

/** Requests queued for kinds whose panel is not mounted yet */
const pendingObjectIds = new Map<DataObjectKind, string>();

/**
 * Requests that a data object be revealed in its panel
 *
 * @param kind - The kind of the data object
 * @param objectId - The ID of the data object
 */
export function focusObject(kind: DataObjectKind, objectId: string): void {
  const handler = handlers.get(kind);
  if (handler !== undefined) {
    handler(objectId);
  } else {
    pendingObjectIds.set(kind, objectId);
  }
}

/**
 * Registers the focus handler for a given data object kind.
 *
 * The panel showing objects of that kind uses this to expand and reveal an
 * object when its load notification is clicked. On mount, a request queued
 * while the panel was unmounted is delivered and consumed. At most one handler
 * per kind is active at a time (the most recently mounted one).
 *
 * @param kind - The kind of data objects the caller shows
 * @param onFocus - See {@link FocusObjectHandler}
 */
export function useFocusObjectHandler(
  kind: DataObjectKind,
  onFocus: FocusObjectHandler,
): void {
  // Keep the latest callback in a ref so the registration effect below only
  // depends on the kind, not on the (often inline) callback identity.
  const onFocusRef = useRef(onFocus);
  useEffect(() => {
    onFocusRef.current = onFocus;
  });

  useEffect(() => {
    const handler: FocusObjectHandler = (objectId) =>
      onFocusRef.current(objectId);
    handlers.set(kind, handler);
    const pendingObjectId = pendingObjectIds.get(kind);
    if (pendingObjectId !== undefined) {
      pendingObjectIds.delete(kind);
      handler(pendingObjectId);
    }
    return () => {
      // Only unregister ourselves; a newer instance may have taken over.
      if (handlers.get(kind) === handler) {
        handlers.delete(kind);
      }
    };
  }, [kind]);
}
