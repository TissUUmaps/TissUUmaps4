import { ITableModel } from "../models/table";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tables: Map<string, ITableModel>;
};

export type TableSliceActions = {
  setTable: (tableId: string, table: ITableModel, tableIndex?: number) => void;
  deleteTable: (tableId: string) => void;
};

export const createTableSlice: BoundStoreStateCreator<TableSlice> = (set) => ({
  ...initialTableSliceState,
  setTable: (tableId, table, tableIndex) =>
    set((draft) => {
      draft.tables = MapUtils.cloneAndSet(
        draft.tables,
        tableId,
        table,
        tableIndex,
      );
    }),
  deleteTable: (tableId) => set((draft) => draft.tables.delete(tableId)),
});

const initialTableSliceState: TableSliceState = {
  tables: new Map<string, ITableModel>(),
};
