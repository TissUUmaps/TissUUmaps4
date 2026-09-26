import type { HierarchicalTableDataSource } from "../HierarchicalTableDataSource";

export const hdf5TableDataSourceType = "hdf5";

export type HDF5TableDataSource = HierarchicalTableDataSource<
  typeof hdf5TableDataSourceType
>;
