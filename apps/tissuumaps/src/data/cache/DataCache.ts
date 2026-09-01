import {
  type Data,
  type DataObject,
  type DataProvider,
  type DataProviderOpenOptions,
  type DataRef,
  type DataSource,
  type ItemsData,
  type ItemsDataProvider,
  type ItemsDataProviderOpenOptions,
  type ItemsDataSource,
  JSONUtils,
  type ProgressCallback,
  type TableData,
  type TableDataSource,
} from "@tissuumaps/core";

import { SharedOperation } from "./SharedOperation";
import type { DataWrapperBase } from "./wrappers/DataWrapperBase";

/**
 * Minimum delay between progress-driven data ref publications, in milliseconds
 *
 * Data providers can report progress extremely frequently (per chunk or even
 * per feature — potentially hundreds of thousands of times for large datasets).
 * Publishing every report would replace the entry's data ref and re-render all
 * of its subscribers per report, making loading unusably slow, so publications
 * are coalesced: the first report is published right away, then at most one per
 * this interval, with a trailing publication so the latest report is never
 * lost.
 */
const PROGRESS_PUBLISH_INTERVAL_MS = 100;

/**
 * Loaded data as handed out by a data cache: the data's own interface, plus the
 * lifetime controls of {@link DataWrapperBase}
 */
export type DataWrapper<TData extends Data> = DataWrapperBase<TData> & TData;

/**
 * A data cache entry: one loaded data instance, shared by all objects whose
 * data sources normalize to the same value
 */
export type DataCacheEntry<
  TDataSource extends DataSource,
  TData extends Data,
  TEntryDependencies extends DataCacheEntryDependencies<TDataSource, TData>,
> = {
  /** The normalized data source the entry's data is loaded from */
  dataSource: TDataSource;

  /** The dependencies the entry's data was loaded with */
  deps: TEntryDependencies;

  /** The IDs of the objects currently referencing the entry */
  objectIds: Set<string>;

  /** The current state of the entry's data, as published to the consumer */
  dataRef: DataRef<DataWrapper<TData>>;

  /** The shared operation loading the entry's data */
  loadOp: SharedOperation<DataWrapper<TData>>;

  /** Whether the entry has been destroyed and its data released */
  destroyed: boolean;
};

/**
 * What an entry's data depends on, besides its data source
 *
 * A cache entry is destroyed and reloaded whenever any of these changes.
 */
export type DataCacheEntryDependencies<
  TDataSource extends DataSource,
  TData extends Data,
  TDataProvider extends DataProvider<TDataSource, TData> = DataProvider<
    TDataSource,
    TData
  >,
> = {
  /**
   * The open workspace, if the entry's data source refers to a path within it,
   * and `null` otherwise
   */
  workspace: FileSystemDirectoryHandle | null;

  /** The data provider registered for the entry's data source type, if any */
  dataProvider: TDataProvider | undefined;
};

/**
 * What an items data cache entry's data depends on, besides its data source
 */
export type ItemsDataCacheEntryDependencies<
  TItemsDataSource extends ItemsDataSource,
  TItemsData extends ItemsData,
> = DataCacheEntryDependencies<
  TItemsDataSource,
  TItemsData,
  ItemsDataProvider<TItemsDataSource, TItemsData>
> & {
  /**
   * The load operation of the table referenced by the entry's data source, if
   * any
   */
  tableLoadOp: SharedOperation<DataWrapper<TableData>> | undefined;
};

/**
 * What a data cache needs from the application's stores to load data
 */
export type DataCacheContext<
  TDataSource extends DataSource,
  TData extends Data,
  TDataProvider extends DataProvider<TDataSource, TData> = DataProvider<
    TDataSource,
    TData
  >,
> = {
  /** The open workspace, if any */
  workspace: FileSystemDirectoryHandle | null;

  /** The registered data providers, by data source type */
  dataProviders: Map<string, TDataProvider>;
};

/**
 * What an items data cache needs from the application's stores to load data
 */
export type ItemsDataCacheContext<
  TItemsDataSource extends ItemsDataSource,
  TItemsData extends ItemsData,
> = DataCacheContext<
  TItemsDataSource,
  TItemsData,
  ItemsDataProvider<TItemsDataSource, TItemsData>
> & {
  /** The tables of the current project, which items data sources may reference */
  tables: DataObject<TableDataSource>[];

  /** The registered table data providers, by data source type */
  tableDataProviders: Map<string, DataProvider<TableDataSource, TableData>>;
};

/**
 * Loads and caches the data of the project's objects, keyed by data source
 *
 * All objects whose data sources normalize to the same value share one cache
 * entry, and hence one loaded data instance, which is wrapped so that consumers
 * cannot close data they do not own. An entry is destroyed once no object
 * references it anymore (see {@link DataCache.retainOnly}), or once any of its
 * dependencies changes, in which case the next load creates a fresh entry.
 *
 * Whenever an entry's state changes, the cache reports the new data reference
 * for each of the objects referencing it, which is how the data store is kept
 * in sync with the cache.
 */
export class DataCache<
  TDataSource extends DataSource,
  TData extends Data,
  TDataProvider extends DataProvider<TDataSource, TData> = DataProvider<
    TDataSource,
    TData
  >,
  TContext extends DataCacheContext<TDataSource, TData, TDataProvider> =
    DataCacheContext<TDataSource, TData, TDataProvider>,
  TEntryDependencies extends DataCacheEntryDependencies<
    TDataSource,
    TData,
    TDataProvider
  > = DataCacheEntryDependencies<TDataSource, TData, TDataProvider>,
> {
  private readonly _resolvedDataSources = new WeakMap<
    TDataSource,
    {
      dataProvider: TDataProvider | undefined;
      normalizedDataSource: TDataSource;
      entryKey: string;
    }
  >();
  private readonly _entries = new Map<
    string,
    DataCacheEntry<TDataSource, TData, TEntryDependencies>
  >();
  private readonly _wrapData: (data: TData) => DataWrapper<TData>;
  private readonly _onObjectDataRefsChanged?: (
    changedObjectDataRefs: Map<string, DataRef<TData>>,
  ) => void;
  private readonly _onObjectDataRefsRemoved?: (
    removedObjectIds: Set<string>,
  ) => void;

  /**
   * @param wrapData - Wraps freshly loaded data before it is handed out
   * @param options - Optional callbacks for observing the data references of
   * the cached objects, called whenever they change respectively are removed
   */
  constructor(
    wrapData: (data: TData) => DataWrapper<TData>,
    options?: {
      onObjectDataRefsChanged?: (
        changedObjectDataRefs: Map<string, DataRef<TData>>,
      ) => void;
      onObjectDataRefsRemoved?: (removedObjectIds: Set<string>) => void;
    },
  ) {
    const { onObjectDataRefsChanged, onObjectDataRefsRemoved } = options ?? {};
    this._wrapData = wrapData;
    this._onObjectDataRefsChanged = onObjectDataRefsChanged;
    this._onObjectDataRefsRemoved = onObjectDataRefsRemoved;
  }

  /**
   * Loads an object's data, or shares the data already loaded for its data
   * source
   *
   * The caller subscribes to the entry's load operation for as long as it waits
   * for the data; see {@link SharedOperation.subscribe} for what aborting the
   * given signal means for an operation still in flight.
   *
   * @param object - The object whose data to load
   * @param context - See {@link DataCacheContext}
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the object's data
   */
  load(
    object: DataObject<TDataSource>,
    context: TContext,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<TData> {
    return this._getOrCreateEntry(object, context).loadOp.subscribe(options);
  }

  /**
   * Destroys all cache entries that none of the given objects reference anymore
   *
   * Entries whose dependencies have changed are destroyed as well, so that the
   * next {@link DataCache.load} reloads their data.
   *
   * @param objects - The objects whose data to keep cached
   * @param context - See {@link DataCacheContext}
   * @returns The data references of the retained objects, by object ID
   */
  retainOnly(
    objects: DataObject<TDataSource>[],
    context: TContext,
  ): Map<string, DataRef<TData>> {
    const retainedObjectIdsByEntryKey = new Map<string, Set<string>>();
    for (const object of objects) {
      const { entryKey } = this._resolveDataSource(object.dataSource, context);
      const retainedObjectIds = retainedObjectIdsByEntryKey.get(entryKey);
      if (retainedObjectIds !== undefined) {
        retainedObjectIds.add(object.id);
      } else {
        retainedObjectIdsByEntryKey.set(entryKey, new Set([object.id]));
      }
    }
    const newObjectDataRefs = new Map<string, DataRef<TData>>();
    for (const [entryKey, entry] of this._entries) {
      const retainedObjectIds = retainedObjectIdsByEntryKey.get(entryKey);
      const newEntryObjectIds =
        retainedObjectIds !== undefined &&
        this._areEntryDependenciesEqual(
          entry.deps,
          this.makeEntryDependencies(entry.dataSource, context, { peek: true }),
        )
          ? entry.objectIds.intersection(retainedObjectIds)
          : new Set<string>();
      if (newEntryObjectIds.size > 0) {
        entry.objectIds = newEntryObjectIds;
        for (const objectId of entry.objectIds) {
          newObjectDataRefs.set(objectId, entry.dataRef);
        }
      } else {
        this._destroyEntry(entry);
        this._entries.delete(entryKey);
      }
    }
    return newObjectDataRefs;
  }

  /**
   * Collects the values that an entry for the given data source depends on
   *
   * @param dataSource - The normalized data source of the entry
   * @param context - See {@link DataCacheContext}
   * @param _options - Set `peek` to not create anything that does not exist yet
   * @returns The entry's dependencies
   */
  protected makeEntryDependencies(
    dataSource: TDataSource,
    context: TContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: { peek?: boolean },
  ): TEntryDependencies {
    return {
      workspace: dataSource.path !== undefined ? context.workspace : null,
      dataProvider: context.dataProviders.get(dataSource.type),
    } as TEntryDependencies;
  }

  /**
   * Determines the data provider to load an entry's data with
   *
   * @param dataSource - The normalized data source of the entry
   * @param entryDeps - The entry's dependencies
   * @returns The data provider for the data source's type
   * @throws Error if the data source's type is not supported
   */
  protected resolveDataProvider(
    dataSource: TDataSource,
    entryDeps: TEntryDependencies,
  ): TDataProvider {
    if (entryDeps.dataProvider === undefined) {
      throw new Error(`Data type not supported: ${dataSource.type}`);
    }
    return entryDeps.dataProvider;
  }

  /**
   * Creates the options with which an entry's data source is opened
   *
   * @param entryDeps - The entry's dependencies
   * @param _options - The load operation's abort signal and progress callback
   * @returns The options passed to the data provider
   */
  protected makeDataProviderOpenOptions(
    entryDeps: TEntryDependencies,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: { signal: AbortSignal; onProgress: ProgressCallback },
  ): DataProviderOpenOptions {
    return { workspace: entryDeps.workspace };
  }

  /**
   * Returns the cache entry for an object's data source, creating one if there
   * is none, or if the existing one's dependencies have changed
   *
   * A newly created entry starts loading right away, takes over the objects
   * referencing the entry it replaces, and removes itself from the cache once
   * its load operation is aborted.
   *
   * @param object - The object whose data source to return the entry for
   * @param context - See {@link DataCacheContext}
   * @returns The cache entry, with the object registered as referencing it
   */
  private _getOrCreateEntry(
    object: DataObject<TDataSource>,
    context: TContext,
  ): DataCacheEntry<TDataSource, TData, TEntryDependencies> {
    const { normalizedDataSource, entryKey } = this._resolveDataSource(
      object.dataSource,
      context,
    );
    const newEntryDeps = this.makeEntryDependencies(
      normalizedDataSource,
      context,
    );
    const entry = this._entries.get(entryKey);
    if (
      entry !== undefined &&
      this._areEntryDependenciesEqual(entry.deps, newEntryDeps)
    ) {
      if (!entry.objectIds.has(object.id)) {
        entry.objectIds.add(object.id);
        this._notifyObjectDataRefsChanged(entry, [object.id]);
      }
      return entry;
    }
    if (entry !== undefined) {
      this._destroyEntry(entry);
      this._entries.delete(entryKey);
    }
    const {
      promise: dataPromise,
      resolve: resolveDataPromise,
      reject: rejectDataPromise,
    } = Promise.withResolvers<DataWrapper<TData>>();
    dataPromise.catch(() => {}); // prevent unhandled rejections in console
    const newEntry: DataCacheEntry<TDataSource, TData, TEntryDependencies> = {
      dataSource: normalizedDataSource,
      deps: newEntryDeps,
      objectIds: new Set([...(entry?.objectIds ?? []), object.id]),
      dataRef: { promise: dataPromise, status: "loading" },
      destroyed: false,
      loadOp: new SharedOperation<DataWrapper<TData>>(async (opts) => {
        const resolvedDataProvider = this.resolveDataProvider(
          normalizedDataSource,
          newEntryDeps,
        );
        const data = await resolvedDataProvider.load(normalizedDataSource, {
          ...this.makeDataProviderOpenOptions(newEntryDeps, opts),
          ...opts,
        });
        return this._wrapData(data);
      }),
    };
    let latestProgress = 0;
    let latestTotal = 0;
    let lastPublishTime = -Infinity;
    let trailingPublishTimer: ReturnType<typeof setTimeout> | undefined;
    const publishLatestProgress = () => {
      lastPublishTime = performance.now();
      if (newEntry.dataRef.status === "loading") {
        newEntry.dataRef = {
          promise: dataPromise,
          status: "loading",
          progress: latestProgress,
          total: latestTotal,
        };
        this._notifyObjectDataRefsChanged(newEntry);
      }
    };
    newEntry.loadOp
      .observe({
        onProgress: (progress, total) => {
          latestProgress = progress;
          latestTotal = total;
          if (trailingPublishTimer !== undefined) {
            return; // the pending publication picks up the latest report
          }
          const elapsed = performance.now() - lastPublishTime;
          if (elapsed >= PROGRESS_PUBLISH_INTERVAL_MS) {
            publishLatestProgress();
          } else {
            trailingPublishTimer = setTimeout(() => {
              trailingPublishTimer = undefined;
              publishLatestProgress();
            }, PROGRESS_PUBLISH_INTERVAL_MS - elapsed);
          }
        },
      })
      .then(
        (data) => {
          clearTimeout(trailingPublishTimer);
          newEntry.dataRef = { promise: dataPromise, status: "loaded", data };
          this._notifyObjectDataRefsChanged(newEntry);
          return data;
        },
        (error) => {
          clearTimeout(trailingPublishTimer);
          newEntry.dataRef = { promise: dataPromise, status: "error", error };
          this._notifyObjectDataRefsChanged(newEntry);
          throw error;
        },
      )
      .then(resolveDataPromise, rejectDataPromise);
    newEntry.loadOp.signal.addEventListener(
      "abort",
      () => {
        if (this._entries.get(entryKey) === newEntry) {
          this._entries.delete(entryKey);
        }
        const removedObjectIds = new Set([...newEntry.objectIds]);
        const destroyed = this._destroyEntry(newEntry);
        if (destroyed) {
          this._notifyObjectDataRefsRemoved(removedObjectIds);
        }
      },
      { once: true },
    );
    this._entries.set(entryKey, newEntry);
    this._notifyObjectDataRefsChanged(newEntry);
    return newEntry;
  }

  /**
   * Destroys a cache entry, aborting its load operation and, once loaded,
   * destroying its data
   *
   * @param entry - The entry to destroy
   * @returns Whether the entry was destroyed by this call, i.e. whether it had
   * not already been destroyed before
   */
  private _destroyEntry(
    entry: DataCacheEntry<TDataSource, TData, TEntryDependencies>,
  ): boolean {
    if (!entry.destroyed) {
      entry.destroyed = true;
      entry.loadOp.abort(new Error("Data source is no longer referenced"));
      if (entry.dataRef.status === "loaded") {
        entry.dataRef.data.destroy();
      } else if (entry.dataRef.status === "loading") {
        entry.dataRef.promise.then(
          (data) => data.destroy(),
          () => {},
        );
      }
      return true;
    }
    return false;
  }

  /**
   * Normalizes a data source and derives the key of its cache entry
   *
   * The result is memoized per data source object, and recomputed whenever the
   * data provider registered for the data source's type changes.
   *
   * @param dataSource - The data source to resolve
   * @param context - See {@link DataCacheContext}
   * @returns The responsible data provider, if any, the normalized data source,
   * and the key of its cache entry
   */
  private _resolveDataSource(
    dataSource: TDataSource,
    context: TContext,
  ): {
    dataProvider: DataProvider<TDataSource, TData> | undefined;
    normalizedDataSource: TDataSource;
    entryKey: string;
  } {
    const cached = this._resolvedDataSources.get(dataSource);
    const dataProvider = context.dataProviders.get(dataSource.type);
    if (cached !== undefined && cached.dataProvider === dataProvider) {
      return cached;
    }
    const normalizedDataSource =
      dataProvider?.normalizeDataSource(dataSource) ?? dataSource;
    const entryKey = JSONUtils.stringify(normalizedDataSource, {
      stable: true,
    });
    const resolved = { dataProvider, normalizedDataSource, entryKey };
    this._resolvedDataSources.set(dataSource, resolved);
    return resolved;
  }

  /**
   * Compares two sets of entry dependencies by identity of their values
   *
   * @param entryDeps - The dependencies an entry was loaded with
   * @param newEntryDeps - The dependencies it would be loaded with now
   * @returns Whether the two are equal
   */
  private _areEntryDependenciesEqual(
    entryDeps: TEntryDependencies,
    newEntryDeps: TEntryDependencies,
  ): boolean {
    const keys = Object.keys(newEntryDeps) as (keyof TEntryDependencies)[];
    return keys.every((key) => entryDeps[key] === newEntryDeps[key]);
  }

  /**
   * Reports an entry's current data reference for the objects referencing it
   *
   * @param entry - The entry whose data reference to report
   * @param objectIds - The IDs of the objects to report it for, defaulting to
   * all objects referencing the entry
   */
  private _notifyObjectDataRefsChanged(
    entry: DataCacheEntry<TDataSource, TData, TEntryDependencies>,
    objectIds: Iterable<string> = entry.objectIds,
  ): void {
    if (this._onObjectDataRefsChanged !== undefined && !entry.destroyed) {
      const changedObjectDataRefs = new Map<string, DataRef<TData>>();
      for (const objectId of objectIds) {
        changedObjectDataRefs.set(objectId, entry.dataRef);
      }
      this._onObjectDataRefsChanged(changedObjectDataRefs);
    }
  }

  /**
   * Reports that objects do not reference any cached data anymore
   *
   * @param removedObjectIds - The IDs of the objects whose data was released
   */
  private _notifyObjectDataRefsRemoved(removedObjectIds: Set<string>): void {
    if (this._onObjectDataRefsRemoved !== undefined) {
      this._onObjectDataRefsRemoved(removedObjectIds);
    }
  }

  /**
   * Returns another data cache's entry for one of its objects
   *
   * This exists so that an {@link ItemsDataCache} can reach into the table data
   * cache, whose entries are private to a different instantiation of this class.
   *
   * @param dataCache - The cache to return the entry of
   * @param object - The object whose data source to return the entry for
   * @param context - The context of the given cache
   * @param options - Set `peek` to return the existing entry, if any, rather
   * than creating one
   * @returns The cache entry, or `undefined` if peeking and there is none
   */
  protected static getEntry<
    TDataSource extends DataSource,
    TData extends Data,
    TDataProvider extends DataProvider<TDataSource, TData>,
    TContext extends DataCacheContext<TDataSource, TData, TDataProvider>,
    TEntryDependencies extends DataCacheEntryDependencies<
      TDataSource,
      TData,
      TDataProvider
    >,
  >(
    dataCache: DataCache<
      TDataSource,
      TData,
      TDataProvider,
      TContext,
      TEntryDependencies
    >,
    object: DataObject<TDataSource>,
    context: TContext,
    options?: { peek?: boolean },
  ): DataCacheEntry<TDataSource, TData, TEntryDependencies> | undefined {
    const { peek = false } = options ?? {};
    if (peek) {
      const { entryKey } = dataCache._resolveDataSource(
        object.dataSource,
        context,
      );
      return dataCache._entries.get(entryKey);
    }
    return dataCache._getOrCreateEntry(object, context);
  }
}

/**
 * Loads and caches the data of the project's labels, points and shapes
 *
 * In addition to what a {@link DataCache} does, an items data cache resolves
 * the table that an items data source may reference, loads it through the table
 * data cache, and hands its data to the data provider. An entry therefore also
 * depends on that table's load operation, and is reloaded whenever the table
 * itself is reloaded.
 */
export class ItemsDataCache<
  TItemsDataSource extends ItemsDataSource,
  TItemsData extends ItemsData,
> extends DataCache<
  TItemsDataSource,
  TItemsData,
  ItemsDataProvider<TItemsDataSource, TItemsData>,
  ItemsDataCacheContext<TItemsDataSource, TItemsData>,
  ItemsDataCacheEntryDependencies<TItemsDataSource, TItemsData>
> {
  private readonly _tableDataCache: DataCache<TableDataSource, TableData>;

  /**
   * @param wrapData - Wraps freshly loaded data before it is handed out
   * @param tableDataCache - The cache through which referenced tables are loaded
   * @param options - Optional callbacks for observing the data references of
   * the cached objects, called whenever they change respectively are removed
   */
  constructor(
    wrapData: (data: TItemsData) => DataWrapper<TItemsData>,
    tableDataCache: DataCache<TableDataSource, TableData>,
    options?: {
      onObjectDataRefsChanged?: (
        changedObjectDataRefs: Map<string, DataRef<TItemsData>>,
      ) => void;
      onObjectDataRefsRemoved?: (objectIds: Set<string>) => void;
    },
  ) {
    super(wrapData, options);
    this._tableDataCache = tableDataCache;
  }

  /**
   * Collects the values that an entry for the given data source depends on,
   * including the load operation of the table it references, if any
   *
   * @param dataSource - The normalized data source of the entry
   * @param context - See {@link ItemsDataCacheContext}
   * @param options - Set `peek` to not start loading a table that is not being
   * loaded yet
   * @returns The entry's dependencies
   */
  protected override makeEntryDependencies(
    dataSource: TItemsDataSource,
    context: ItemsDataCacheContext<TItemsDataSource, TItemsData>,
    options?: { peek?: boolean },
  ): ItemsDataCacheEntryDependencies<TItemsDataSource, TItemsData> {
    return {
      ...super.makeEntryDependencies(dataSource, context, options),
      tableLoadOp: this._getTableLoadOperation(dataSource, context, options),
    };
  }

  /**
   * Determines the data provider to load an entry's data with, and ensures that
   * the table referenced by the data source, if any, has been resolved
   *
   * @param dataSource - The normalized data source of the entry
   * @param entryDeps - The entry's dependencies
   * @returns The data provider for the data source's type
   * @throws Error if the data source's type is not supported, or if it
   * references a table that is not part of the project
   */
  protected override resolveDataProvider(
    dataSource: TItemsDataSource,
    entryDeps: ItemsDataCacheEntryDependencies<TItemsDataSource, TItemsData>,
  ): ItemsDataProvider<TItemsDataSource, TItemsData> {
    const dataProvider = super.resolveDataProvider(dataSource, entryDeps);
    if (dataSource.table !== undefined && entryDeps.tableLoadOp === undefined) {
      throw new Error(`Table not found: ${dataSource.table}`);
    }
    return dataProvider;
  }

  /**
   * Creates the options with which an entry's data source is opened, subscribing
   * to the referenced table's data on the entry's behalf
   *
   * @param entryDeps - The entry's dependencies
   * @param options - The load operation's abort signal and progress callback
   * @returns The options passed to the items data provider
   */
  protected override makeDataProviderOpenOptions(
    entryDeps: ItemsDataCacheEntryDependencies<TItemsDataSource, TItemsData>,
    options: { signal: AbortSignal; onProgress: ProgressCallback },
  ): ItemsDataProviderOpenOptions {
    const { signal } = options;
    let tableDataPromise: Promise<TableData> | undefined;
    if (entryDeps.tableLoadOp !== undefined) {
      tableDataPromise = entryDeps.tableLoadOp.subscribe({ signal });
      tableDataPromise.catch(() => {}); // prevent unhandled rejections in console
    }
    return {
      ...super.makeDataProviderOpenOptions(entryDeps, options),
      tableDataPromise,
    };
  }

  /**
   * Returns the load operation of the table referenced by a data source
   *
   * @param dataSource - The data source referencing the table
   * @param context - See {@link ItemsDataCacheContext}
   * @param options - Set `peek` to not start loading a table that is not being
   * loaded yet
   * @returns The table's load operation, or `undefined` if the data source does
   * not reference a table, the table is not part of the project, or - when
   * peeking - the table is not being loaded
   */
  private _getTableLoadOperation(
    dataSource: TItemsDataSource,
    context: ItemsDataCacheContext<TItemsDataSource, TItemsData>,
    options?: { peek?: boolean },
  ): SharedOperation<DataWrapper<TableData>> | undefined {
    if (dataSource.table === undefined) {
      return undefined;
    }
    const table = context.tables.find((table) => table.id === dataSource.table);
    if (table === undefined) {
      return undefined;
    }
    const tableDataCacheContext = {
      workspace: context.workspace,
      dataProviders: context.tableDataProviders,
    };
    const tableCacheEntry = DataCache.getEntry(
      this._tableDataCache,
      table,
      tableDataCacheContext,
      options,
    );
    return tableCacheEntry?.loadOp;
  }
}
