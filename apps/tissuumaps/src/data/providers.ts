import {
  CSVTableDataProvider,
  GeoJSONShapesDataProvider,
  OMEZarrImageDataProvider,
  OpenSeadragonImageDataProvider,
  ParquetTableDataProvider,
  TablePointsDataProvider,
  csvTableDataSourceType,
  geoJSONShapesDataSourceType,
  omeZarrImageDataSourceType,
  openSeadragonImageDataSourceType,
  parquetTableDataSourceType,
  tablePointsDataSourceType,
} from "@tissuumaps/storage";

import { appStore } from "@/stores/app";

/**
 * Registers the data providers shipped with TissUUmaps with the app store
 *
 * Called once during application startup, before any project is loaded.
 */
export function enableBuiltInDataProviders(): void {
  const appStoreState = appStore.getState();

  appStoreState.registerImageDataProvider(
    omeZarrImageDataSourceType,
    new OMEZarrImageDataProvider(),
  );

  appStoreState.registerImageDataProvider(
    openSeadragonImageDataSourceType,
    new OpenSeadragonImageDataProvider(),
  );

  appStoreState.registerPointsDataProvider(
    tablePointsDataSourceType,
    new TablePointsDataProvider(),
  );

  appStoreState.registerShapesDataProvider(
    geoJSONShapesDataSourceType,
    new GeoJSONShapesDataProvider(),
  );

  appStoreState.registerTableDataProvider(
    csvTableDataSourceType,
    new CSVTableDataProvider(),
  );
  appStoreState.registerTableDataProvider(
    parquetTableDataSourceType,
    new ParquetTableDataProvider(),
  );
}
