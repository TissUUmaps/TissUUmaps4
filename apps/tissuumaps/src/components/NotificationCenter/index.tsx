import {
  ChartScatterIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ImageIcon,
  LoaderCircleIcon,
  ShapesIcon,
  TableIcon,
  TagsIcon,
  XIcon,
} from "lucide-react";
import { type ComponentType, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import type { Data, DataRef } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import type { DataObjectKind } from "@/hooks/useFocusObject";
import { useDataStore } from "@/stores/data";
import { useProjectStore } from "@/stores/project";

/**
 * How long a finished load lingers at 100% before its card is removed, in
 * milliseconds, so the user sees the load complete rather than vanish.
 */
const DONE_LINGER_MS = 1500;

/** How long a failed load's card stays before it is removed, in milliseconds */
const ERROR_LINGER_MS = 5000;

const kindIcons: Record<
  DataObjectKind,
  ComponentType<{ className?: string }>
> = {
  image: ImageIcon,
  labels: TagsIcon,
  points: ChartScatterIcon,
  shapes: ShapesIcon,
  table: TableIcon,
};

const kindLabels: Record<DataObjectKind, string> = {
  image: "Image",
  labels: "Labels",
  points: "Points",
  shapes: "Shapes",
  table: "Table",
};

/** A load notification derived from one data reference in the data store */
type LoadEntry = {
  /** `${kind}:${objectId}` — the sonner toast ID */
  key: string;
  kind: DataObjectKind;
  /** ID of the underlying data object (used for navigation on click) */
  objectId: string;
  /** Card title, composed from the object's kind and name */
  title: string;
  status: "loading" | "loaded" | "error";
  /** The most recent progress report, if there was any */
  progress?: number;
  total?: number;
  /** Why loading failed, when `status` is `"error"` */
  error?: unknown;
};

/** What the notification center remembers about one card between renders */
type TrackedToast = {
  /** Whether the tracked load is still running or has settled */
  phase: "loading" | "settled";
  /** Whether the user dismissed the card (suppresses further updates) */
  dismissed: boolean;
  /** The entry the card was last rendered with */
  rendered?: LoadEntry;
  /** The timer removing a settled card after its linger period */
  dismissTimer?: ReturnType<typeof setTimeout>;
};

export type NotificationCenterProps = {
  /** Reveal a data object in its panel (activate tab + expand object) */
  onOpenObject: (kind: DataObjectKind, objectId: string) => void;
};

/**
 * Shows a progress toast for every data load tracked by the data store.
 *
 * The data store is the single source of truth: the data caches publish a
 * {@link DataRef} per object, whose `"loading"` state carries the latest
 * progress report. Each loading reference is mirrored to a long-lived sonner
 * toast, which lingers briefly once the reference settles (`"loaded"` or
 * `"error"`) and is dismissed when the reference is removed. Sonner handles the
 * stacked layout, hover-to-expand and enter/exit animations; we render the card
 * content ourselves.
 */
export function NotificationCenter({ onOpenObject }: NotificationCenterProps) {
  const imageDataRefs = useDataStore((state) => state.imageDataRefs);
  const labelsDataRefs = useDataStore((state) => state.labelsDataRefs);
  const pointsDataRefs = useDataStore((state) => state.pointsDataRefs);
  const shapesDataRefs = useDataStore((state) => state.shapesDataRefs);
  const tableDataRefs = useDataStore((state) => state.tableDataRefs);

  const images = useProjectStore((state) => state.images);
  const labels = useProjectStore((state) => state.labels);
  const points = useProjectStore((state) => state.points);
  const shapes = useProjectStore((state) => state.shapes);
  const tables = useProjectStore((state) => state.tables);

  const entries = useMemo(() => {
    const collect = <TData extends Data>(
      kind: DataObjectKind,
      dataRefs: Map<string, DataRef<TData>>,
      objects: { id: string; name: string }[],
    ): LoadEntry[] =>
      [...dataRefs].map(([objectId, dataRef]) => {
        const name =
          objects.find((object) => object.id === objectId)?.name ?? objectId;
        return {
          key: `${kind}:${objectId}`,
          kind,
          objectId,
          title: `${kindLabels[kind]}: ${name}`,
          status: dataRef.status,
          progress: dataRef.status === "loading" ? dataRef.progress : undefined,
          total: dataRef.status === "loading" ? dataRef.total : undefined,
          error: dataRef.status === "error" ? dataRef.error : undefined,
        };
      });
    return [
      ...collect("image", imageDataRefs, images),
      ...collect("labels", labelsDataRefs, labels),
      ...collect("points", pointsDataRefs, points),
      ...collect("shapes", shapesDataRefs, shapes),
      ...collect("table", tableDataRefs, tables),
    ];
  }, [
    imageDataRefs,
    labelsDataRefs,
    pointsDataRefs,
    shapesDataRefs,
    tableDataRefs,
    images,
    labels,
    points,
    shapes,
    tables,
  ]);

  const trackedRef = useRef<Map<string, TrackedToast>>(new Map());

  useEffect(() => {
    const tracked = trackedRef.current;

    const dismiss = (key: string) => {
      const trackedToast = tracked.get(key);
      if (trackedToast !== undefined) {
        trackedToast.dismissed = true;
      }
      toast.dismiss(key);
    };

    const show = (trackedToast: TrackedToast, entry: LoadEntry) => {
      trackedToast.rendered = entry;
      toast.custom(
        () => (
          <NotificationCard
            entry={entry}
            onOpenObject={onOpenObject}
            onDismiss={dismiss}
          />
        ),
        { id: entry.key, duration: Infinity },
      );
    };

    const currentKeys = new Set<string>();
    for (const entry of entries) {
      currentKeys.add(entry.key);
      let trackedToast = tracked.get(entry.key);
      if (entry.status === "loading") {
        if (trackedToast === undefined) {
          trackedToast = { phase: "loading", dismissed: false };
          tracked.set(entry.key, trackedToast);
        } else if (trackedToast.phase !== "loading") {
          // The reference was replaced: a new load started for this object.
          trackedToast.phase = "loading";
          trackedToast.dismissed = false;
          clearTimeout(trackedToast.dismissTimer);
          trackedToast.dismissTimer = undefined;
        }
        if (
          !trackedToast.dismissed &&
          !areEntriesEqual(trackedToast.rendered, entry)
        ) {
          show(trackedToast, entry);
        }
      } else if (
        trackedToast !== undefined &&
        trackedToast.phase !== "settled"
      ) {
        // Only loads we saw running get a settle card; data that is already
        // loaded when the center mounts stays silent.
        trackedToast.phase = "settled";
        if (!trackedToast.dismissed) {
          show(trackedToast, entry);
          trackedToast.dismissTimer = setTimeout(
            () => toast.dismiss(entry.key),
            entry.status === "loaded" ? DONE_LINGER_MS : ERROR_LINGER_MS,
          );
        }
      }
    }
    for (const [key, trackedToast] of tracked) {
      if (!currentKeys.has(key)) {
        clearTimeout(trackedToast.dismissTimer);
        toast.dismiss(key);
        tracked.delete(key);
      }
    }
  }, [entries, onOpenObject]);

  // Clear all cards and linger timers when the center unmounts.
  useEffect(() => {
    const tracked = trackedRef.current;
    return () => {
      for (const [key, trackedToast] of tracked) {
        clearTimeout(trackedToast.dismissTimer);
        toast.dismiss(key);
      }
      tracked.clear();
    };
  }, []);

  return <Toaster />;
}

/** Compares the fields of two entries that affect how a card is rendered */
function areEntriesEqual(a: LoadEntry | undefined, b: LoadEntry): boolean {
  return (
    a !== undefined &&
    a.status === b.status &&
    a.progress === b.progress &&
    a.total === b.total &&
    a.title === b.title &&
    a.error === b.error
  );
}

type NotificationCardProps = {
  entry: LoadEntry;
  onOpenObject: (kind: DataObjectKind, objectId: string) => void;
  onDismiss: (key: string) => void;
};

function NotificationCard({
  entry,
  onOpenObject,
  onDismiss,
}: NotificationCardProps) {
  const KindIcon = kindIcons[entry.kind];
  const determinate = entry.total !== undefined && entry.total > 0;

  return (
    <div className="flex w-96 max-w-full flex-col gap-2 rounded-md border bg-card p-3 text-card-foreground shadow-lg">
      <div className="flex flex-row items-center gap-x-2">
        <button
          type="button"
          onClick={() => onOpenObject(entry.kind, entry.objectId)}
          className="flex min-w-0 flex-1 cursor-pointer flex-row items-center gap-x-2 text-left"
          title="Show in panel"
        >
          <KindIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{entry.title}</span>
        </button>
        {entry.status === "loading" ? (
          <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : entry.status === "loaded" ? (
          <CircleCheckIcon className="size-4 shrink-0 text-primary" />
        ) : (
          <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDismiss(entry.key)}
          title="Dismiss"
        >
          <XIcon />
        </Button>
      </div>
      <Progress
        value={
          entry.status === "loaded"
            ? 1
            : determinate
              ? (entry.progress ?? 0)
              : null
        }
        max={entry.status === "loaded" ? 1 : determinate ? entry.total : 100}
      />
      <div className="truncate text-xs text-muted-foreground">
        {entry.status === "loading" &&
          `Loading…${determinate ? ` — ${formatProgress(entry.progress ?? 0, entry.total ?? 0)}` : ""}`}
        {entry.status === "loaded" && "Done"}
        {entry.status === "error" && formatError(entry.error)}
      </div>
    </div>
  );
}

/** Formats a progress fraction as a rounded percentage, e.g. "42%" */
function formatProgress(progress: number, total: number): string {
  if (total <= 0) {
    return "…";
  }
  return `${Math.round((progress / total) * 100)}%`;
}

/** Formats a loading error for the card's status line */
function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Failed: ${message}`;
}
