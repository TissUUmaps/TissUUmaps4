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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Data, DataRef } from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { useProjectStore } from "@/stores/project";

/** How long a finished load stays visible, in milliseconds */
const doneLingerMs = 1500;

type DataObjectKind = {
  kind: string;
  label: string;
  icon: LucideIcon;
  dataRefs: Map<string, DataRef<Data>>;
  objects: { id: string; name: string }[];
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
  const kinds = useMemo<DataObjectKind[]>(
    () => [
      {
        kind: "image",
        label: "Image",
        icon: ImageIcon,
        dataRefs: imageDataRefs,
        objects: images,
      },
      {
        kind: "labels",
        label: "Labels",
        icon: TagsIcon,
        dataRefs: labelsDataRefs,
        objects: labels,
      },
      {
        kind: "points",
        label: "Points",
        icon: ChartScatterIcon,
        dataRefs: pointsDataRefs,
        objects: points,
      },
      {
        kind: "shapes",
        label: "Shapes",
        icon: ShapesIcon,
        dataRefs: shapesDataRefs,
        objects: shapes,
      },
      {
        kind: "table",
        label: "Table",
        icon: TableIcon,
        dataRefs: tableDataRefs,
        objects: tables,
      },
    ],
    [
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
    ],
  );

  // Cards are keyed by `${kind}:${id}`. Two objects may share one data ref
  // (same data source), so the ref itself cannot identify a card. A dismissal
  // hides one failed ref per key; a later load of the object shows again.
  const [dismissed, setDismissed] = useState(
    () => new Map<string, DataRef<Data>>(),
  );
  const [done, setDone] = useState(() => new Set<string>());
  const seenLoading = useRef(new Set<string>());
  const lingerTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Keep loads that were seen running visible for a moment after they finish,
  // and forget loads that are gone. A layout effect so the card never misses
  // a frame between the store's update and the linger state.
  useLayoutEffect(() => {
    const dataRefs = new Map<string, DataRef<Data>>();
    for (const { kind, dataRefs: refs } of kinds) {
      for (const [id, dataRef] of refs) {
        dataRefs.set(`${kind}:${id}`, dataRef);
      }
    }
    for (const key of seenLoading.current) {
      const status = dataRefs.get(key)?.status;
      if (status === undefined || status === "error") {
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
        clearTimeout(lingerTimers.current.get(key));
        lingerTimers.current.set(
          key,
          setTimeout(() => {
            lingerTimers.current.delete(key);
            setDone((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }, doneLingerMs),
        );
      }
    }
  }, [kinds]);

  useEffect(() => {
    const timers = lingerTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-80 flex-col gap-1">
      {kinds.flatMap(({ kind, label, icon, dataRefs, objects }) =>
        [...dataRefs]
          .filter(
            ([id, dataRef]) =>
              (dataRef.status !== "loaded" || done.has(`${kind}:${id}`)) &&
              dismissed.get(`${kind}:${id}`) !== dataRef,
          )
          .map(([id, dataRef]) => (
            <NotificationCard
              key={`${kind}:${id}`}
              label={label}
              icon={icon}
              name={objects.find((object) => object.id === id)?.name ?? id}
              dataRef={dataRef}
              onDismiss={() =>
                setDismissed((prev) =>
                  new Map(prev).set(`${kind}:${id}`, dataRef),
                )
              }
            />
          )),
      )}
    </div>
  );
}

type NotificationCardProps = {
  label: string;
  icon: LucideIcon;
  name: string;
  dataRef: DataRef<Data>;
  onDismiss: () => void;
};

function NotificationCard({
  label,
  icon: Icon,
  name,
  dataRef,
  onDismiss,
}: NotificationCardProps) {
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
