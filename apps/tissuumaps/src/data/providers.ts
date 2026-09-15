import {
  CSVTableDataProvider,
  GeoJSONShapesDataProvider,
  OMEZarrImageDataProvider,
  OMEZarrLabelsDataProvider,
  OpenSeadragonImageDataProvider,
  ParquetShapesDataProvider,
  ParquetTableDataProvider,
  TablePointsDataProvider,
  csvTableDataSourceType,
  geoJSONShapesDataSourceType,
  omeZarrImageDataSourceType,
  omeZarrLabelsDataSourceType,
  openSeadragonImageDataSourceType,
  parquetShapesDataSourceType,
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
    openSeadragonImageDataSourceType,
    new OpenSeadragonImageDataProvider(),
  );

  appStoreState.registerImageDataProvider(
    omeZarrImageDataSourceType,
    new OMEZarrImageDataProvider(),
  );

  appStoreState.registerLabelsDataProvider(
    omeZarrLabelsDataSourceType,
    new OMEZarrLabelsDataProvider(),
  );

  appStoreState.registerPointsDataProvider(
    tablePointsDataSourceType,
    new TablePointsDataProvider(),
  );

  appStoreState.registerShapesDataProvider(
    geoJSONShapesDataSourceType,
    new GeoJSONShapesDataProvider(),
  );
  appStoreState.registerShapesDataProvider(
    parquetShapesDataSourceType,
    new ParquetShapesDataProvider(),
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
