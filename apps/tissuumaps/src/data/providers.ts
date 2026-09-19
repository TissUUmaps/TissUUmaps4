import {
  CSVTableDataProvider,
  GeoJSONShapesDataProvider,
  GeoParquetShapesDataProvider,
  OMEZarrImageDataProvider,
  OMEZarrLabelsDataProvider,
  OpenSeadragonImageDataProvider,
  ParquetTableDataProvider,
  TIFFImageDataProvider,
  TIFFLabelsDataProvider,
  TablePointsDataProvider,
  csvTableDataSourceType,
  geoJSONShapesDataSourceType,
  geoParquetShapesDataSourceType,
  omeZarrImageDataSourceType,
  omeZarrLabelsDataSourceType,
  openSeadragonImageDataSourceType,
  parquetTableDataSourceType,
  tablePointsDataSourceType,
  tiffImageDataSourceType,
  tiffLabelsDataSourceType,
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

  appStoreState.registerImageDataProvider(
    tiffImageDataSourceType,
    new TIFFImageDataProvider(),
  );

  appStoreState.registerLabelsDataProvider(
    tiffLabelsDataSourceType,
    new TIFFLabelsDataProvider(),
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
    geoParquetShapesDataSourceType,
    new GeoParquetShapesDataProvider(),
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
