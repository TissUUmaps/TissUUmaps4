import {
  ChartScatterIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ImageIcon,
  LoaderCircleIcon,
  type LucideIcon,
  ShapesIcon,
  TableIcon,
  TagsIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Data, DataRef } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { useProjectStore } from "@/stores/project";

/** How long a finished load stays visible, in milliseconds */
const doneLingerMs = 1500;

type DataObjectKind = "image" | "labels" | "points" | "shapes" | "table";

const kinds: Record<DataObjectKind, { label: string; icon: LucideIcon }> = {
  image: { label: "Image", icon: ImageIcon },
  labels: { label: "Labels", icon: TagsIcon },
  points: { label: "Points", icon: ChartScatterIcon },
  shapes: { label: "Shapes", icon: ShapesIcon },
  table: { label: "Table", icon: TableIcon },
};

type Notification = {
  kind: DataObjectKind;
  id: string;
  name: string;
  dataRef: DataRef<Data>;
};

/**
 * Shows a thin card for every data load that is running or has failed
 *
 * Cards are derived from the data store on every render, so they need no state
 * of their own: a card appears when a data ref is loading, lingers briefly once
 * it is loaded, and disappears when it is removed. A failed load stays until
 * dismissed.
 */
export function NotificationCenter() {
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

  // Cards are keyed by `${kind}:${id}`. Two objects may share one data ref
  // (same data source), so the ref itself cannot identify a card. A dismissal
  // hides one failed ref per key; a later load of the object shows again.
  const [dismissed, setDismissed] = useState(
    () => new Map<string, DataRef<Data>>(),
  );
  const [done, setDone] = useState(() => new Set<string>());
  const seenLoading = useRef(new Set<string>());
  const lingerTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  // Keep loads that were seen running visible for a moment after they finish,
  // and forget loads that are gone.
  useEffect(() => {
    const dataRefsByKind: Record<DataObjectKind, Map<string, DataRef<Data>>> = {
      image: imageDataRefs,
      labels: labelsDataRefs,
      points: pointsDataRefs,
      shapes: shapesDataRefs,
      table: tableDataRefs,
    };
    const dataRefs = new Map<string, DataRef<Data>>();
    for (const [kind, refs] of Object.entries(dataRefsByKind)) {
      for (const [id, dataRef] of refs) {
        dataRefs.set(`${kind}:${id}`, dataRef);
      }
    }
    for (const key of seenLoading.current) {
      if (dataRefs.get(key)?.status !== "loading") {
        seenLoading.current.delete(key);
      }
    }
    for (const [key, dataRef] of dataRefs) {
      if (dataRef.status === "loading") {
        seenLoading.current.add(key);
      } else if (
        dataRef.status === "loaded" &&
        seenLoading.current.delete(key)
      ) {
        setDone((prev) => new Set(prev).add(key));
        const timer = setTimeout(() => {
          lingerTimers.current.delete(timer);
          setDone((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, doneLingerMs);
        lingerTimers.current.add(timer);
      }
    }
  }, [
    imageDataRefs,
    labelsDataRefs,
    pointsDataRefs,
    shapesDataRefs,
    tableDataRefs,
  ]);

  useEffect(() => {
    const timers = lingerTimers.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, []);

  const collect = (
    kind: DataObjectKind,
    dataRefs: Map<string, DataRef<Data>>,
    objects: { id: string; name: string }[],
  ): Notification[] =>
    [...dataRefs]
      .filter(
        ([id, dataRef]) =>
          (dataRef.status !== "loaded" || done.has(`${kind}:${id}`)) &&
          dismissed.get(`${kind}:${id}`) !== dataRef,
      )
      .map(([id, dataRef]) => ({
        kind,
        id,
        name: objects.find((object) => object.id === id)?.name ?? id,
        dataRef,
      }));
  const notifications = [
    ...collect("image", imageDataRefs, images),
    ...collect("labels", labelsDataRefs, labels),
    ...collect("points", pointsDataRefs, points),
    ...collect("shapes", shapesDataRefs, shapes),
    ...collect("table", tableDataRefs, tables),
  ];

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-80 flex-col gap-1">
      {notifications.map(({ kind, id, name, dataRef }) => (
        <NotificationCard
          key={`${kind}:${id}`}
          kind={kind}
          name={name}
          dataRef={dataRef}
          onDismiss={() =>
            setDismissed((prev) => new Map(prev).set(`${kind}:${id}`, dataRef))
          }
        />
      ))}
    </div>
  );
}

type NotificationCardProps = {
  kind: DataObjectKind;
  name: string;
  dataRef: DataRef<Data>;
  onDismiss: () => void;
};

function NotificationCard({
  kind,
  name,
  dataRef,
  onDismiss,
}: NotificationCardProps) {
  const { label, icon: Icon } = kinds[kind];
  const fraction =
    dataRef.status === "loaded"
      ? 1
      : dataRef.status === "loading" && dataRef.total
        ? (dataRef.progress ?? 0) / dataRef.total
        : undefined;
  const error =
    dataRef.status === "error"
      ? dataRef.error instanceof Error
        ? dataRef.error.message
        : String(dataRef.error)
      : undefined;

  return (
    <div
      className="pointer-events-auto relative overflow-hidden rounded-md border bg-card px-2 py-1 text-xs text-card-foreground shadow"
      title={error !== undefined ? `Failed: ${error}` : `${label}: ${name}`}
    >
      <div className="flex items-center gap-x-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          {label}: {name}
        </span>
        {dataRef.status === "loaded" ? (
          <CircleCheckIcon className="size-3.5 shrink-0 text-primary" />
        ) : error !== undefined ? (
          <>
            <CircleAlertIcon className="size-3.5 shrink-0 text-destructive" />
            <span className="max-w-1/2 truncate text-destructive">{error}</span>
          </>
        ) : fraction !== undefined ? (
          <span className="tabular-nums text-muted-foreground">
            {Math.round(fraction * 100)}%
          </span>
        ) : (
          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
        {error !== undefined && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="-mr-1 size-5"
            onClick={onDismiss}
            title="Dismiss"
          >
            <XIcon />
          </Button>
        )}
      </div>
      {fraction !== undefined && (
        <div
          className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-[width] duration-200"
          style={{ width: `${fraction * 100}%` }}
        />
      )}
    </div>
  );
}
