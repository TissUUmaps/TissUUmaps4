import type { HierarchicalTable } from "../HierarchicalTable";
import { HierarchicalTableDataProviderBase } from "../HierarchicalTableDataProviderBase";
import { HierarchicalTableReader } from "../HierarchicalTableReader";
import type { ZarrTableDataSource } from "./ZarrTableDataSource";
import { openZarrStore } from "./openZarrStore";

/**
 * Reads tables from Zarr stores, including the AnnData tables of SpatialData
 * stores
 *
 * Zarr reads are asynchronous fetches, so no Web Worker is needed.
 */
export class ZarrTableDataProvider extends HierarchicalTableDataProviderBase<ZarrTableDataSource> {
  readonly name = "Zarr";

  protected async openHierarchicalTable(
    normalizedSource: string,
    options: {
      signal?: AbortSignal;
      workspace: FileSystemDirectoryHandle | null;
    },
  ): Promise<HierarchicalTable> {
    const { signal, workspace } = options;
    signal?.throwIfAborted();
    const store = await openZarrStore(normalizedSource, { signal, workspace });
    return await HierarchicalTableReader.open(store, { signal });
  }
}
