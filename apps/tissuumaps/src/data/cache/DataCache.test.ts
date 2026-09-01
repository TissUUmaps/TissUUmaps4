import { type Mock, describe, expect, it, vi } from "vitest";

import type {
  Data,
  DataObject,
  DataProvider,
  DataProviderOpenOptions,
  DataRef,
  DataSource,
  ItemsData,
  ItemsDataProvider,
  ItemsDataProviderOpenOptions,
  ItemsDataSource,
  TableData,
  TableDataSource,
} from "@tissuumaps/core";

import {
  DataCache,
  type DataCacheContext,
  ItemsDataCache,
  type ItemsDataCacheContext,
} from "./DataCache";
import { DataWrapperBase } from "./wrappers/DataWrapperBase";
import { TableDataWrapper } from "./wrappers/TableDataWrapper";

type TestDataSource = DataSource<"test">;

type TestData = Data & { value: string };

type TestItemsDataSource = ItemsDataSource<"test">;

type TestItemsData = ItemsData & { value: string };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets every pending microtask and job queued by a settled promise run */
async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Resolves with the rejection reason, or fails if the promise resolves */
function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("Expected the promise to reject");
    },
    (error: unknown) => error,
  );
}

class TestDataWrapper extends DataWrapperBase<TestData> implements TestData {
  get value(): string {
    return this.data.value;
  }
}

class TestItemsDataWrapper
  extends DataWrapperBase<TestItemsData>
  implements TestItemsData
{
  get value(): string {
    return this.data.value;
  }

  getIds(): number[] {
    return this.data.getIds();
  }

  getSize(): number {
    return this.data.getSize();
  }

  getNames(): string[] | undefined {
    return this.data.getNames();
  }
}

function createTestData(value = "data"): { data: TestData; close: Mock } {
  const close = vi.fn();
  return { data: { value, close }, close };
}

function createTestItemsData(value = "items"): {
  data: TestItemsData;
  close: Mock;
} {
  const close = vi.fn();
  return {
    data: {
      value,
      close,
      getIds: () => [],
      getSize: () => 0,
      getNames: () => undefined,
    },
    close,
  };
}

function createTestTableData(): { data: TableData; close: Mock } {
  const close = vi.fn();
  const notImplemented = () => Promise.reject(new Error("Not implemented"));
  return {
    data: {
      close,
      getIds: () => [],
      getSize: () => 0,
      getNames: () => undefined,
      suggestColumnQueries: () => Promise.resolve([]),
      resolveColumnQuery: () => Promise.resolve(null),
      loadValues: notImplemented,
      loadUniqueValues: notImplemented,
      loadValueRange: notImplemented,
    },
    close,
  };
}

type LoadCall<TDataSource extends DataSource, TData extends Data, TOptions> = {
  dataSource: TDataSource;
  options: TOptions | undefined;
  deferred: Deferred<TData>;
};

/**
 * Creates a data provider whose loads stay pending until the corresponding
 * captured call's deferred is settled
 */
function createTestDataProvider(options?: {
  normalizeDataSource?: (dataSource: TestDataSource) => TestDataSource;
}): {
  dataProvider: DataProvider<TestDataSource, TestData>;
  load: Mock;
  calls: LoadCall<TestDataSource, TestData, DataProviderOpenOptions>[];
} {
  const { normalizeDataSource = (dataSource: TestDataSource) => dataSource } =
    options ?? {};
  const calls: LoadCall<TestDataSource, TestData, DataProviderOpenOptions>[] =
    [];
  const load = vi.fn(
    (dataSource: TestDataSource, openOptions?: DataProviderOpenOptions) => {
      const deferred = createDeferred<TestData>();
      calls.push({ dataSource, options: openOptions, deferred });
      return deferred.promise;
    },
  );
  return {
    dataProvider: {
      name: "Test data provider",
      schema: {},
      uischema: { type: "VerticalLayout" },
      normalizeDataSource,
      load,
    },
    load,
    calls,
  };
}

/** Items data provider counterpart of {@link createTestDataProvider} */
function createTestItemsDataProvider(): {
  dataProvider: ItemsDataProvider<TestItemsDataSource, TestItemsData>;
  load: Mock;
  calls: LoadCall<
    TestItemsDataSource,
    TestItemsData,
    ItemsDataProviderOpenOptions
  >[];
} {
  const calls: LoadCall<
    TestItemsDataSource,
    TestItemsData,
    ItemsDataProviderOpenOptions
  >[] = [];
  const load = vi.fn(
    (
      dataSource: TestItemsDataSource,
      openOptions?: ItemsDataProviderOpenOptions,
    ) => {
      const deferred = createDeferred<TestItemsData>();
      calls.push({ dataSource, options: openOptions, deferred });
      return deferred.promise;
    },
  );
  return {
    dataProvider: {
      name: "Test items data provider",
      schema: {},
      uischema: { type: "VerticalLayout" },
      normalizeDataSource: (dataSource) => dataSource,
      load,
    },
    load,
    calls,
  };
}

/** Table data provider counterpart of {@link createTestDataProvider} */
function createTestTableDataProvider(): {
  dataProvider: DataProvider<TableDataSource, TableData>;
  load: Mock;
  calls: LoadCall<TableDataSource, TableData, DataProviderOpenOptions>[];
} {
  const calls: LoadCall<TableDataSource, TableData, DataProviderOpenOptions>[] =
    [];
  const load = vi.fn(
    (dataSource: TableDataSource, openOptions?: DataProviderOpenOptions) => {
      const deferred = createDeferred<TableData>();
      calls.push({ dataSource, options: openOptions, deferred });
      return deferred.promise;
    },
  );
  return {
    dataProvider: {
      name: "Test table data provider",
      schema: {},
      uischema: { type: "VerticalLayout" },
      normalizeDataSource: (dataSource) => dataSource,
      load,
    },
    load,
    calls,
  };
}

function createTestDataCache(): {
  dataCache: DataCache<TestDataSource, TestData>;
  onObjectDataRefsChanged: Mock<
    (changedObjectDataRefs: ReadonlyMap<string, DataRef<TestData>>) => void
  >;
  onObjectDataRefsRemoved: Mock<
    (removedObjectIds: ReadonlySet<string>) => void
  >;
} {
  const onObjectDataRefsChanged =
    vi.fn<
      (changedObjectDataRefs: ReadonlyMap<string, DataRef<TestData>>) => void
    >();
  const onObjectDataRefsRemoved =
    vi.fn<(removedObjectIds: ReadonlySet<string>) => void>();
  const dataCache = new DataCache<TestDataSource, TestData>(
    (data) => new TestDataWrapper(data),
    { onObjectDataRefsChanged, onObjectDataRefsRemoved },
  );
  return { dataCache, onObjectDataRefsChanged, onObjectDataRefsRemoved };
}

function createObject(
  id: string,
  dataSource: TestDataSource,
): DataObject<TestDataSource> {
  return { id, name: id, dataSource };
}

function createContext(
  dataProvider: DataProvider<TestDataSource, TestData> | undefined,
  options?: { workspace?: FileSystemDirectoryHandle | null },
): DataCacheContext<TestDataSource, TestData> {
  const { workspace = null } = options ?? {};
  const dataProviders = new Map<
    string,
    DataProvider<TestDataSource, TestData>
  >();
  if (dataProvider !== undefined) {
    dataProviders.set("test", dataProvider);
  }
  return { workspace, dataProviders };
}

function createWorkspace(): FileSystemDirectoryHandle {
  return { kind: "directory", name: "workspace" } as FileSystemDirectoryHandle;
}

describe("DataCache", () => {
  describe("load", () => {
    it("loads the data through the data provider and wraps it", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const { data } = createTestData("value");

      const promise = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.resolve(data);
      const loadedData = await promise;

      expect(load).toHaveBeenCalledOnce();
      expect(calls.at(-1)!.dataSource).toEqual({ type: "test", url: "a.test" });
      expect(loadedData).toBeInstanceOf(TestDataWrapper);
      expect(loadedData.value).toBe("value");
    });

    it("passes the workspace to the data provider for local data sources", () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const workspace = createWorkspace();
      const object = createObject("a", { type: "test", path: "a.test" });

      void dataCache.load(object, createContext(dataProvider, { workspace }));

      expect(calls.at(-1)!.options?.workspace).toBe(workspace);
    });

    it("passes no workspace to the data provider for remote data sources", () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      void dataCache.load(
        object,
        createContext(dataProvider, { workspace: createWorkspace() }),
      );

      expect(calls.at(-1)!.options?.workspace).toBeNull();
    });

    it("passes a pending signal and a progress callback to the data provider", () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      void dataCache.load(object, createContext(dataProvider));

      expect(calls.at(-1)!.options?.signal?.aborted).toBe(false);
      expect(typeof calls.at(-1)!.options?.onProgress).toBe("function");
    });

    it("forwards the progress reported by the data provider", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const onProgress = vi.fn();

      const promise = dataCache.load(object, createContext(dataProvider), {
        onProgress,
      });
      calls.at(-1)!.options?.onProgress?.(2, 5);

      expect(onProgress).toHaveBeenCalledWith(2, 5);

      calls.at(-1)!.deferred.resolve(createTestData().data);
      await promise;
    });

    it("loads the data only once for the same object", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });

      const first = dataCache.load(object, context);
      const second = dataCache.load(object, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);

      await expect(Promise.all([first, second])).resolves.toEqual([
        await first,
        await first,
      ]);
      expect(load).toHaveBeenCalledOnce();
    });

    it("shares the data between objects with equal data sources", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "shared.test" });
      const second = createObject("b", { type: "test", url: "shared.test" });

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);

      expect(await firstPromise).toBe(await secondPromise);
      expect(load).toHaveBeenCalledOnce();
    });

    it("shares the data between objects whose data sources normalize equally", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider({
        normalizeDataSource: (dataSource) => ({
          ...dataSource,
          url: dataSource.url ?? "default.test",
        }),
      });
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test" });
      const second = createObject("b", { type: "test", url: "default.test" });

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);

      expect(await firstPromise).toBe(await secondPromise);
      expect(load).toHaveBeenCalledOnce();
      expect(calls.at(-1)!.dataSource).toEqual({
        type: "test",
        url: "default.test",
      });
    });

    it("loads the data separately for different data sources", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "a.test" });
      const second = createObject("b", { type: "test", url: "b.test" });

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls[0]!.deferred.resolve(createTestData("first").data);
      calls[1]!.deferred.resolve(createTestData("second").data);

      expect((await firstPromise).value).toBe("first");
      expect((await secondPromise).value).toBe("second");
      expect(load).toHaveBeenCalledTimes(2);
    });

    it("rejects when no data provider is registered for the data source type", async () => {
      const { dataCache } = createTestDataCache();
      const object = createObject("a", { type: "test", url: "a.test" });

      await expect(
        dataCache.load(object, createContext(undefined)),
      ).rejects.toThrow("Data type not supported: test");
    });

    it("rejects with the data provider failure unchanged", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const failure = new Error("boom");

      const promise = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.reject(failure);

      expect(await captureRejection(promise)).toBe(failure);
    });

    it("does not retry the load after a failed attempt", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const failure = new Error("boom");

      const failing = dataCache.load(object, context);
      calls.at(-1)!.deferred.reject(failure);
      await captureRejection(failing);

      expect(await captureRejection(dataCache.load(object, context))).toBe(
        failure,
      );
      expect(load).toHaveBeenCalledOnce();
    });

    it("loads again after a failed attempt once a dependency changes", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const failing = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.reject(new Error("boom"));
      await captureRejection(failing);
      const {
        dataProvider: newDataProvider,
        load: newLoad,
        calls: newCalls,
      } = createTestDataProvider();
      const retried = dataCache.load(object, createContext(newDataProvider));
      newCalls.at(-1)!.deferred.resolve(createTestData("retried").data);

      expect((await retried).value).toBe("retried");
      expect(newLoad).toHaveBeenCalledOnce();
    });

    it("aborts the load once its last caller aborted", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const controller = new AbortController();

      const aborted = dataCache.load(object, context, {
        signal: controller.signal,
      });
      controller.abort();
      const error = await captureRejection(aborted);
      await flushAsync(); // abandonment is decided one macrotask later

      expect((error as DOMException).name).toBe("AbortError");
      expect(calls.at(-1)!.options?.signal?.aborted).toBe(true);
    });

    it("keeps the load running while another caller is still waiting", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const controller = new AbortController();

      const aborted = dataCache.load(object, context, {
        signal: controller.signal,
      });
      const kept = dataCache.load(object, context);
      controller.abort();
      await captureRejection(aborted);

      expect(calls.at(-1)!.options?.signal?.aborted).toBe(false);

      calls.at(-1)!.deferred.resolve(createTestData("kept").data);

      expect((await kept).value).toBe("kept");
      expect(load).toHaveBeenCalledOnce();
    });

    it("discards the entry of an abandoned load, so that it is loaded anew", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const controller = new AbortController();

      const aborted = dataCache.load(object, context, {
        signal: controller.signal,
      });
      controller.abort();
      await captureRejection(aborted);
      await flushAsync(); // abandonment is decided one macrotask later
      const reloaded = dataCache.load(object, context);
      calls.at(-1)!.deferred.resolve(createTestData("reloaded").data);

      expect((await reloaded).value).toBe("reloaded");
      expect(load).toHaveBeenCalledTimes(2);
    });

    it("keeps the entry of a load that is reclaimed within the same task", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const controller = new AbortController();

      const aborted = dataCache.load(object, context, {
        signal: controller.signal,
      });
      const abortedError = captureRejection(aborted);
      controller.abort();
      // the caller comes back before the event loop turns, as a re-running
      // React effect or a superseded renderer pass does
      const reclaimed = dataCache.load(object, context);
      await flushAsync();
      calls.at(-1)!.deferred.resolve(createTestData("kept").data);

      expect(((await abortedError) as DOMException).name).toBe("AbortError");
      expect((await reclaimed).value).toBe("kept");
      expect(load).toHaveBeenCalledOnce();
    });

    it("destroys the data of an abandoned load that still resolves", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const { data, close } = createTestData();
      const controller = new AbortController();

      const aborted = dataCache.load(object, createContext(dataProvider), {
        signal: controller.signal,
      });
      controller.abort();
      await captureRejection(aborted);
      await flushAsync(); // abandonment is decided one macrotask later
      calls.at(-1)!.deferred.resolve(data);
      await flushAsync();

      expect(close).toHaveBeenCalledOnce();
    });
  });

  describe("object data refs", () => {
    it("notifies a loading data ref when an entry is created", () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      void dataCache.load(object, createContext(dataProvider));

      expect(onObjectDataRefsChanged).toHaveBeenCalledOnce();
      const changed = onObjectDataRefsChanged.mock.lastCall![0];
      expect([...changed.keys()]).toEqual(["a"]);
      expect(changed.get("a")).toMatchObject({ status: "loading" });
    });

    it("notifies the reported progress while loading", () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      void dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.options?.onProgress?.(2, 5);

      expect(onObjectDataRefsChanged.mock.lastCall![0].get("a")).toMatchObject({
        status: "loading",
        progress: 2,
        total: 5,
      });
    });

    it("coalesces frequent progress reports into throttled publications", () => {
      vi.useFakeTimers();
      try {
        const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
        const { dataProvider, calls } = createTestDataProvider();
        const object = createObject("a", { type: "test", url: "a.test" });

        void dataCache.load(object, createContext(dataProvider));
        onObjectDataRefsChanged.mockClear();
        const onProgress = calls.at(-1)!.options!.onProgress!;

        // The first report is published right away; the following reports are
        // coalesced into one trailing publication carrying the latest report.
        onProgress(1, 5);
        onProgress(2, 5);
        onProgress(3, 5);
        expect(onObjectDataRefsChanged).toHaveBeenCalledOnce();
        expect(
          onObjectDataRefsChanged.mock.lastCall![0].get("a"),
        ).toMatchObject({ status: "loading", progress: 1, total: 5 });

        vi.runAllTimers();
        expect(onObjectDataRefsChanged).toHaveBeenCalledTimes(2);
        expect(
          onObjectDataRefsChanged.mock.lastCall![0].get("a"),
        ).toMatchObject({ status: "loading", progress: 3, total: 5 });
      } finally {
        vi.useRealTimers();
      }
    });

    it("ignores progress reported after the load settled", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await promise;
      onObjectDataRefsChanged.mockClear();
      calls.at(-1)!.options?.onProgress?.(2, 5);

      expect(onObjectDataRefsChanged).not.toHaveBeenCalled();
    });

    it("notifies a loaded data ref holding the wrapped data", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.resolve(createTestData("value").data);
      const loadedData = await promise;

      const dataRef = onObjectDataRefsChanged.mock.lastCall![0].get("a");
      expect(dataRef).toMatchObject({ status: "loaded", data: loadedData });
      await expect(dataRef!.promise).resolves.toBe(loadedData);
    });

    it("notifies an error data ref when the load fails", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const failure = new Error("boom");

      const promise = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.reject(failure);
      await captureRejection(promise);

      expect(onObjectDataRefsChanged.mock.lastCall![0].get("a")).toMatchObject({
        status: "error",
        error: failure,
      });
    });

    it("keeps the data ref promise stable across status changes", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, createContext(dataProvider));
      const loadingPromise =
        onObjectDataRefsChanged.mock.lastCall![0].get("a")!.promise;
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await promise;

      expect(onObjectDataRefsChanged.mock.lastCall![0].get("a")!.promise).toBe(
        loadingPromise,
      );
    });

    it("notifies only the object that joins an existing entry", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "shared.test" });
      const second = createObject("b", { type: "test", url: "shared.test" });

      const promise = dataCache.load(first, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await promise;
      onObjectDataRefsChanged.mockClear();
      void dataCache.load(second, context);

      expect(onObjectDataRefsChanged).toHaveBeenCalledOnce();
      expect([...onObjectDataRefsChanged.mock.lastCall![0].keys()]).toEqual([
        "b",
      ]);
    });

    it("notifies all objects sharing an entry with the same data ref", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "shared.test" });
      const second = createObject("b", { type: "test", url: "shared.test" });

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await Promise.all([firstPromise, secondPromise]);

      const changed = onObjectDataRefsChanged.mock.lastCall![0];
      expect([...changed.keys()]).toEqual(["a", "b"]);
      expect(changed.get("a")).toBe(changed.get("b"));
    });

    it("removes the data refs of an abandoned load", async () => {
      const { dataCache, onObjectDataRefsRemoved } = createTestDataCache();
      const { dataProvider } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const controller = new AbortController();

      const aborted = dataCache.load(object, createContext(dataProvider), {
        signal: controller.signal,
      });
      controller.abort();
      await captureRejection(aborted);
      await flushAsync(); // abandonment is decided one macrotask later

      expect(onObjectDataRefsRemoved).toHaveBeenCalledOnce();
      expect(onObjectDataRefsRemoved).toHaveBeenCalledWith(new Set(["a"]));
    });

    it("removes the data refs of all objects sharing an abandoned entry", async () => {
      const { dataCache, onObjectDataRefsRemoved } = createTestDataCache();
      const { dataProvider } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "shared.test" });
      const second = createObject("b", { type: "test", url: "shared.test" });
      const controller = new AbortController();

      const abortedFirst = dataCache.load(first, context, {
        signal: controller.signal,
      });
      const abortedSecond = dataCache.load(second, context, {
        signal: controller.signal,
      });
      controller.abort();
      await captureRejection(abortedFirst);
      await captureRejection(abortedSecond);
      await flushAsync(); // abandonment is decided one macrotask later

      expect(onObjectDataRefsRemoved).toHaveBeenCalledWith(new Set(["a", "b"]));
    });

    it("does not notify again when the same object is loaded twice", () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });

      void dataCache.load(object, context);
      void dataCache.load(object, context);

      expect(onObjectDataRefsChanged).toHaveBeenCalledOnce();
    });
  });

  describe("entry dependencies", () => {
    it("reloads the data when the workspace changes", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", path: "a.test" });
      const { data, close } = createTestData();

      const promise = dataCache.load(
        object,
        createContext(dataProvider, { workspace: createWorkspace() }),
      );
      calls.at(-1)!.deferred.resolve(data);
      await promise;
      void dataCache.load(
        object,
        createContext(dataProvider, { workspace: createWorkspace() }),
      );
      await flushAsync();

      expect(load).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledOnce();
    });

    it("keeps the data of remote data sources when the workspace changes", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });
      const { data, close } = createTestData();

      const promise = dataCache.load(
        object,
        createContext(dataProvider, { workspace: createWorkspace() }),
      );
      calls.at(-1)!.deferred.resolve(data);
      await promise;
      void dataCache.load(
        object,
        createContext(dataProvider, { workspace: createWorkspace() }),
      );
      await flushAsync();

      expect(load).toHaveBeenCalledOnce();
      expect(close).not.toHaveBeenCalled();
    });

    it("reloads the data when the data provider changes", async () => {
      const { dataCache } = createTestDataCache();
      const first = createTestDataProvider();
      const second = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, createContext(first.dataProvider));
      first.calls.at(-1)!.deferred.resolve(createTestData("first").data);
      await promise;
      const reloaded = dataCache.load(
        object,
        createContext(second.dataProvider),
      );
      second.calls.at(-1)!.deferred.resolve(createTestData("second").data);

      expect((await reloaded).value).toBe("second");
      expect(first.load).toHaveBeenCalledOnce();
      expect(second.load).toHaveBeenCalledOnce();
    });

    it("keeps the data when only the data provider map identity changes", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, createContext(dataProvider));
      calls.at(-1)!.deferred.resolve(createTestData("value").data);
      await promise;
      const reloaded = dataCache.load(object, createContext(dataProvider));

      expect((await reloaded).value).toBe("value");
      expect(load).toHaveBeenCalledOnce();
    });
  });

  describe("retainOnly", () => {
    it("returns the current data refs of the retained objects", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);
      const loadedData = await promise;
      const objectDataRefs = dataCache.retainOnly([object], context);

      expect([...objectDataRefs.keys()]).toEqual(["a"]);
      expect(objectDataRefs.get("a")).toMatchObject({
        status: "loaded",
        data: loadedData,
      });
    });

    it("keeps the entry of a retained object", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const { data, close } = createTestData();

      const promise = dataCache.load(object, context);
      calls.at(-1)!.deferred.resolve(data);
      await promise;
      dataCache.retainOnly([object], context);
      await dataCache.load(object, context);

      expect(load).toHaveBeenCalledOnce();
      expect(close).not.toHaveBeenCalled();
    });

    it("omits objects without an entry from the returned data refs", () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider } = createTestDataProvider();
      const object = createObject("a", { type: "test", url: "a.test" });

      const objectDataRefs = dataCache.retainOnly(
        [object],
        createContext(dataProvider),
      );

      expect(objectDataRefs.size).toBe(0);
    });

    it("destroys the data of objects that are no longer retained", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const { data, close } = createTestData();

      const promise = dataCache.load(object, context);
      calls.at(-1)!.deferred.resolve(data);
      await promise;
      const objectDataRefs = dataCache.retainOnly([], context);

      expect(objectDataRefs.size).toBe(0);
      expect(close).toHaveBeenCalledOnce();
    });

    it("aborts the pending load of objects that are no longer retained", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, context);
      dataCache.retainOnly([], context);

      expect(calls.at(-1)!.options?.signal?.aborted).toBe(true);
      expect(calls.at(-1)!.options?.signal?.reason).toEqual(
        new Error("Data source is no longer referenced"),
      );

      calls.at(-1)!.deferred.reject(calls.at(-1)!.options?.signal?.reason);
      await captureRejection(promise);
    });

    it("destroys the data of an aborted load that still resolves", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });
      const { data, close } = createTestData();

      const promise = dataCache.load(object, context);
      dataCache.retainOnly([], context);
      calls.at(-1)!.deferred.resolve(data);
      await promise;
      await flushAsync();

      expect(close).toHaveBeenCalledOnce();
    });

    it("does not report removed data refs for entries it destroys", async () => {
      const { dataCache, onObjectDataRefsRemoved } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await promise;
      dataCache.retainOnly([], context);

      expect(onObjectDataRefsRemoved).not.toHaveBeenCalled();
    });

    it("stops notifying the data refs of destroyed entries", async () => {
      const { dataCache, onObjectDataRefsChanged } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const object = createObject("a", { type: "test", url: "a.test" });

      const promise = dataCache.load(object, context);
      dataCache.retainOnly([], context);
      onObjectDataRefsChanged.mockClear();
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await promise;
      await flushAsync();

      expect(onObjectDataRefsChanged).not.toHaveBeenCalled();
    });

    it("returns the data refs of all objects sharing an entry", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "shared.test" });
      const second = createObject("b", { type: "test", url: "shared.test" });

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls.at(-1)!.deferred.resolve(createTestData().data);
      await Promise.all([firstPromise, secondPromise]);
      const objectDataRefs = dataCache.retainOnly([first, second], context);

      expect([...objectDataRefs.keys()]).toEqual(["a", "b"]);
      expect(objectDataRefs.get("a")).toBe(objectDataRefs.get("b"));
    });

    it("drops objects that are no longer retained from a shared entry", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, load, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "shared.test" });
      const second = createObject("b", { type: "test", url: "shared.test" });
      const { data, close } = createTestData();

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls.at(-1)!.deferred.resolve(data);
      await Promise.all([firstPromise, secondPromise]);
      const objectDataRefs = dataCache.retainOnly([first], context);

      expect([...objectDataRefs.keys()]).toEqual(["a"]);
      expect(close).not.toHaveBeenCalled();
      expect(load).toHaveBeenCalledOnce();
    });

    it("destroys entries whose dependencies changed", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const object = createObject("a", { type: "test", path: "a.test" });
      const { data, close } = createTestData();

      const promise = dataCache.load(
        object,
        createContext(dataProvider, { workspace: createWorkspace() }),
      );
      calls.at(-1)!.deferred.resolve(data);
      await promise;
      const objectDataRefs = dataCache.retainOnly(
        [object],
        createContext(dataProvider, { workspace: createWorkspace() }),
      );

      expect(objectDataRefs.size).toBe(0);
      expect(close).toHaveBeenCalledOnce();
    });

    it("destroys all entries when nothing is retained", async () => {
      const { dataCache } = createTestDataCache();
      const { dataProvider, calls } = createTestDataProvider();
      const context = createContext(dataProvider);
      const first = createObject("a", { type: "test", url: "a.test" });
      const second = createObject("b", { type: "test", url: "b.test" });
      const { data: firstData, close: closeFirstData } = createTestData();
      const { data: secondData, close: closeSecondData } = createTestData();

      const firstPromise = dataCache.load(first, context);
      const secondPromise = dataCache.load(second, context);
      calls[0]!.deferred.resolve(firstData);
      calls[1]!.deferred.resolve(secondData);
      await Promise.all([firstPromise, secondPromise]);
      const objectDataRefs = dataCache.retainOnly([], context);

      expect(objectDataRefs.size).toBe(0);
      expect(closeFirstData).toHaveBeenCalledOnce();
      expect(closeSecondData).toHaveBeenCalledOnce();
    });
  });
});

function createItemsObject(
  id: string,
  dataSource: TestItemsDataSource,
): DataObject<TestItemsDataSource> {
  return { id, name: id, dataSource };
}

function createTableObject(id: string): DataObject<TableDataSource> {
  return { id, name: id, dataSource: { type: "table", url: `${id}.table` } };
}

function createItemsContext(options: {
  dataProvider: ItemsDataProvider<TestItemsDataSource, TestItemsData>;
  tableDataProvider?: DataProvider<TableDataSource, TableData>;
  tables?: DataObject<TableDataSource>[];
  workspace?: FileSystemDirectoryHandle | null;
}): ItemsDataCacheContext<TestItemsDataSource, TestItemsData> {
  const {
    dataProvider,
    tableDataProvider,
    tables = [],
    workspace = null,
  } = options;
  const dataProviders = new Map<
    string,
    ItemsDataProvider<TestItemsDataSource, TestItemsData>
  >([["test", dataProvider]]);
  const tableDataProviders = new Map<
    string,
    DataProvider<TableDataSource, TableData>
  >();
  if (tableDataProvider !== undefined) {
    tableDataProviders.set("table", tableDataProvider);
  }
  return { workspace, dataProviders, tables, tableDataProviders };
}

describe("ItemsDataCache", () => {
  it("passes no table data promise for data sources without a table", () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, calls } = createTestItemsDataProvider();
    const object = createItemsObject("a", { type: "test", url: "a.test" });

    void itemsDataCache.load(object, createItemsContext({ dataProvider }));

    expect(calls.at(-1)!.options?.tableDataPromise).toBeUndefined();
  });

  it("loads the referenced table and passes its data to the data provider", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, calls } = createTestItemsDataProvider();
    const table = createTableObject("t");
    const tableDataProvider = createTestTableDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "t",
    });

    void itemsDataCache.load(
      object,
      createItemsContext({
        dataProvider,
        tableDataProvider: tableDataProvider.dataProvider,
        tables: [table],
      }),
    );
    tableDataProvider.calls
      .at(-1)!
      .deferred.resolve(createTestTableData().data);

    expect(tableDataProvider.load).toHaveBeenCalledOnce();
    await expect(
      calls.at(-1)!.options?.tableDataPromise,
    ).resolves.toBeInstanceOf(TableDataWrapper);
  });

  it("rejects when the referenced table is not found", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, load } = createTestItemsDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "missing",
    });

    await expect(
      itemsDataCache.load(object, createItemsContext({ dataProvider })),
    ).rejects.toThrow("Table not found: missing");
    expect(load).not.toHaveBeenCalled();
  });

  it("reloads the items when the table entry is recreated", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, load, calls } = createTestItemsDataProvider();
    const table = createTableObject("t");
    const first = createTestTableDataProvider();
    const second = createTestTableDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "t",
    });

    const promise = itemsDataCache.load(
      object,
      createItemsContext({
        dataProvider,
        tableDataProvider: first.dataProvider,
        tables: [table],
      }),
    );
    first.calls.at(-1)!.deferred.resolve(createTestTableData().data);
    calls.at(-1)!.deferred.resolve(createTestItemsData().data);
    await promise;
    void itemsDataCache.load(
      object,
      createItemsContext({
        dataProvider,
        tableDataProvider: second.dataProvider,
        tables: [table],
      }),
    );

    expect(second.load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledTimes(2);
    expect(calls.at(-1)!.options?.tableDataPromise).not.toBe(
      calls[0]!.options?.tableDataPromise,
    );
  });

  it("keeps the items entry while the table entry is retained", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, load, calls } = createTestItemsDataProvider();
    const table = createTableObject("t");
    const tableDataProvider = createTestTableDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "t",
    });
    const itemsContext = createItemsContext({
      dataProvider,
      tableDataProvider: tableDataProvider.dataProvider,
      tables: [table],
    });

    const promise = itemsDataCache.load(object, itemsContext);
    tableDataProvider.calls
      .at(-1)!
      .deferred.resolve(createTestTableData().data);
    calls.at(-1)!.deferred.resolve(createTestItemsData().data);
    await promise;
    tableDataCache.retainOnly([table], {
      workspace: null,
      dataProviders: itemsContext.tableDataProviders,
    });
    const objectDataRefs = itemsDataCache.retainOnly([object], itemsContext);

    expect([...objectDataRefs.keys()]).toEqual(["a"]);
    expect(load).toHaveBeenCalledOnce();
  });

  it("destroys the items entry when the table entry is destroyed", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, calls } = createTestItemsDataProvider();
    const table = createTableObject("t");
    const tableDataProvider = createTestTableDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "t",
    });
    const itemsContext = createItemsContext({
      dataProvider,
      tableDataProvider: tableDataProvider.dataProvider,
      tables: [table],
    });
    const { data: itemsData, close: closeItemsData } = createTestItemsData();

    const promise = itemsDataCache.load(object, itemsContext);
    tableDataProvider.calls
      .at(-1)!
      .deferred.resolve(createTestTableData().data);
    calls.at(-1)!.deferred.resolve(itemsData);
    await promise;
    tableDataCache.retainOnly([], {
      workspace: null,
      dataProviders: itemsContext.tableDataProviders,
    });
    const objectDataRefs = itemsDataCache.retainOnly([object], itemsContext);

    expect(objectDataRefs.size).toBe(0);
    expect(closeItemsData).toHaveBeenCalledOnce();
    expect(tableDataProvider.load).toHaveBeenCalledOnce();
  });

  it("keeps the referenced table's load alive while the items load needs it", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider } = createTestItemsDataProvider();
    const table = createTableObject("t");
    const tableDataProvider = createTestTableDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "t",
    });
    const itemsContext = createItemsContext({
      dataProvider,
      tableDataProvider: tableDataProvider.dataProvider,
      tables: [table],
    });
    const tableContext = {
      workspace: null,
      dataProviders: itemsContext.tableDataProviders,
    };
    const tableController = new AbortController();

    // the table is loaded for its own consumer as well as for the items load
    const abortedTable = tableDataCache.load(table, tableContext, {
      signal: tableController.signal,
    });
    void itemsDataCache.load(object, itemsContext);
    tableController.abort();
    await captureRejection(abortedTable);

    expect(tableDataProvider.calls.at(-1)!.options?.signal?.aborted).toBe(
      false,
    );
  });

  it("abandons the referenced table's load when the items load is abandoned", async () => {
    const tableDataCache = new DataCache<TableDataSource, TableData>(
      (data) => new TableDataWrapper(data),
    );
    const itemsDataCache = new ItemsDataCache<
      TestItemsDataSource,
      TestItemsData
    >((data) => new TestItemsDataWrapper(data), tableDataCache);
    const { dataProvider, calls } = createTestItemsDataProvider();
    const table = createTableObject("t");
    const tableDataProvider = createTestTableDataProvider();
    const object = createItemsObject("a", {
      type: "test",
      url: "a.test",
      table: "t",
    });
    const itemsContext = createItemsContext({
      dataProvider,
      tableDataProvider: tableDataProvider.dataProvider,
      tables: [table],
    });
    const controller = new AbortController();

    const aborted = itemsDataCache.load(object, itemsContext, {
      signal: controller.signal,
    });
    controller.abort();
    await captureRejection(aborted);
    await flushAsync(); // the items load is abandoned
    await flushAsync(); // its claim on the table is released, and that abandoned

    expect(calls.at(-1)!.options?.signal?.aborted).toBe(true);
    expect(tableDataProvider.calls.at(-1)!.options?.signal?.aborted).toBe(true);
  });
});
