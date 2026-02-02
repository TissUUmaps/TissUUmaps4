import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { useTissUUmaps } from "@/store";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  CircleIcon,
  DiamondIcon,
  MinusIcon,
  PlusIcon,
  Share2Icon,
  SquareIcon,
  StarIcon,
  TriangleIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Marker, type TableData } from "@tissuumaps/core";

import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useMarkerConfigContext } from "./context";

export { MarkerConfigContextProvider } from "./MarkerConfigContextProvider";
export { MarkerConfigSourceToggleGroup } from "./MarkerConfigSourceToggleGroup";

const markers = [
  {
    value: Marker.Cross,
    icon: <PlusIcon className="fill-foreground size-4" />,
    label: "Plus",
  },
  {
    value: Marker.Diamond,
    icon: <DiamondIcon className="fill-foreground size-4" />,
    label: "Diamond",
  },
  {
    value: Marker.Square,
    icon: <SquareIcon className="fill-foreground size-4" />,
    label: "Square",
  },
  {
    value: Marker.TriangleUp,
    icon: <TriangleIcon className="fill-foreground size-4" />,
    label: "Triangle up",
  },
  {
    value: Marker.Star,
    icon: <StarIcon className="fill-foreground size-4" />,
    label: "Star",
  },
  {
    value: Marker.Clobber,
    icon: <Share2Icon className="fill-foreground size-4 rotate-90" />,
    label: "Tri-up",
  },
  {
    value: Marker.Disc,
    icon: <CircleIcon className="fill-foreground size-4" />,
    label: "Point",
  },
  {
    value: Marker.HBar,
    icon: <MinusIcon className="fill-foreground size-4" />,
    label: "Horizontal line",
  },
  {
    value: Marker.VBar,
    icon: <MinusIcon className="fill-foreground size-4 rotate-90" />,
    label: "Vertical line",
  },
  {
    value: Marker.TailedArrow,
    icon: <ArrowRightIcon className="fill-foreground size-4" />,
    label: "Arrow right",
  },
  {
    value: Marker.TriangleDown,
    icon: <TriangleIcon className="fill-foreground size-4 rotate-180" />,
    label: "Triangle down",
  },
  {
    value: Marker.Ring,
    icon: <CircleIcon className="fill-background size-4" />,
    label: "Circle",
  },
  {
    value: Marker.X,
    icon: <XIcon className="fill-foreground size-4" />,
    label: "X",
  },
  {
    value: Marker.Arrow,
    icon: <ChevronRightIcon className="fill-background size-4" />,
    label: "Chevron right",
  },
  {
    value: Marker.Gaussian,
    icon: <CircleIcon className="fill-foreground size-4" />,
    label: "Gaussian",
  },
];

export type MarkerConfigControlProps = {
  className?: string;
};

export function MarkerConfigControl({ className }: MarkerConfigControlProps) {
  const { currentSource } = useMarkerConfigContext();

  switch (currentSource) {
    case "constant":
      return <ConstantMarkerConfigControl className={className} />;
    case "from":
      return <FromMarkerConfigControl className={className} />;
    case "groupBy":
      return <GroupByMarkerConfigControl className={className} />;
  }
}

type ConstantMarkerConfigControlProps = {
  className?: string;
};

function ConstantMarkerConfigControl({
  className,
}: ConstantMarkerConfigControlProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    useMarkerConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Marker</FieldLabel>
        <SimpleSelect
          items={markers}
          itemLabel={(marker) => (
            <>
              {marker.icon} {marker.label}
            </>
          )}
          itemValue={(marker) => marker.value}
          value={value}
          onValueChange={(value) => {
            if (value !== null) {
              setValue(value);
            }
          }}
        />
      </Field>
    </div>
  );
}

type FromMarkerConfigControlProps = {
  className?: string;
};

function FromMarkerConfigControl({ className }: FromMarkerConfigControlProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
  } = useMarkerConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const [tableData, setTableData] = useState<TableData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    async function loadTableData() {
      if (table) {
        const tableData = await loadTable(table, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setTableData(tableData);
        }
      }
    }
    loadTableData().catch(console.error);
    return () => {
      abortController.abort();
    };
  }, [table, loadTable]);

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-x-2">
        <Field>
          <FieldLabel>Source table</FieldLabel>
          <SimpleSelect
            items={tables}
            itemLabel={(table) => table.name}
            itemValue={(table) => table.id}
            value={table}
            onValueChange={setTable}
          />
        </Field>
        <Field disabled={table === null}>
          <FieldLabel>Source column</FieldLabel>
          <SimpleAsyncCombobox
            suggestQueries={async (currentQuery) => {
              if (tableData !== null) {
                return await tableData.suggestColumnQueries(currentQuery);
              }
              return Promise.resolve([]);
            }}
            getItem={async (query) => {
              if (tableData !== null) {
                return await tableData.getColumn(query);
              }
              return Promise.resolve(null);
            }}
            itemQuery={(column) => column}
            selectedItem={column}
            onSelectedItemChange={setColumn}
          />
        </Field>
      </div>
    </div>
  );
}

type GroupByMarkerConfigControlProps = {
  className?: string;
};

function GroupByMarkerConfigControl({
  className,
}: GroupByMarkerConfigControlProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = useMarkerConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const markerMaps = useTissUUmaps((state) => state.markerMaps);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const [tableData, setTableData] = useState<TableData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    async function loadTableData() {
      if (table) {
        const tableData = await loadTable(table, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setTableData(tableData);
        }
      }
    }
    loadTableData().catch(console.error);
    return () => {
      abortController.abort();
    };
  }, [table, loadTable]);

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-x-2">
        <Field>
          <FieldLabel>Source table</FieldLabel>
          <SimpleSelect
            items={tables}
            itemLabel={(table) => table.name}
            itemValue={(table) => table.id}
            value={table}
            onValueChange={setTable}
          />
        </Field>
        <Field disabled={table === null}>
          <FieldLabel>Source column</FieldLabel>
          <SimpleAsyncCombobox
            suggestQueries={async (currentQuery) => {
              if (tableData !== null) {
                return await tableData.suggestColumnQueries(currentQuery);
              }
              return Promise.resolve([]);
            }}
            getItem={async (query) => {
              if (tableData !== null) {
                return await tableData.getColumn(query);
              }
              return Promise.resolve(null);
            }}
            itemQuery={(column) => column}
            selectedItem={column}
            onSelectedItemChange={setColumn}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Marker map</FieldLabel>
        <SimpleSelect
          items={markerMaps}
          itemLabel={(markerMap) => markerMap.name}
          itemValue={(markerMap) => markerMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
