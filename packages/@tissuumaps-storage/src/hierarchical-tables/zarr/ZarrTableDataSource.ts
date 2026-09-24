import type { HierarchicalTableDataSource } from "../HierarchicalTableDataSource";

export const zarrTableDataSourceType = "zarr";

export type ZarrTableDataSource = HierarchicalTableDataSource<
  typeof zarrTableDataSourceType
>;
