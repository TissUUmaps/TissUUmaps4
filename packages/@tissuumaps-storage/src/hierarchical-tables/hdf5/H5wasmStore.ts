import h5wasm, { type Dataset, type Group, type File as H5File } from "h5wasm";

import type {
  Store,
  StoreArray,
  StoreDataType,
  StoreGroup,
  StoreNode,
  StoreValues,
} from "../Store";

/** HDF5 datatype classes (H5T_class_t); enums read as their integer codes */
const dataTypes: Record<number, StoreDataType> = {
  0: "integer", // H5T_INTEGER
  1: "float", // H5T_FLOAT
  3: "string", // H5T_STRING
  8: "integer", // H5T_ENUM
};

/**
 * A {@link Store} over an HDF5 file opened with h5wasm
 *
 * h5wasm reads synchronously through the Emscripten file system, so an
 * instance must live in a Web Worker when the file is a lazily fetched URL.
 */
export class H5wasmStore implements Store {
  private readonly _file: H5File;

  /**
   * @param file - An HDF5 file opened for reading
   */
  constructor(file: H5File) {
    this._file = file;
  }

  /**
   * Mounts the source into the Emscripten file system and opens it
   *
   * URLs are read on demand through HTTP range requests (falling back to a
   * full download when the server does not advertise byte serving); files are
   * mounted without being copied. Both require a Web Worker context.
   *
   * @param source - The file or URL to open
   * @param options - Optional abort signal
   * @returns A store for the opened file
   */
  static async open(
    source: File | string,
    options?: { signal?: AbortSignal },
  ): Promise<H5wasmStore> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { FS } = await h5wasm.ready;
    signal?.throwIfAborted(); // h5wasm.ready does not throw on abort
    let path;
    if (typeof source === "string") {
      FS.createLazyFile("/", "data.h5", source, true, false);
      path = "/data.h5";
    } else {
      FS.mkdir("/work");
      const { WORKERFS } = FS.filesystems as {
        WORKERFS: FS.FileSystemType;
      };
      FS.mount(WORKERFS, { files: [source] }, "/work");
      path = `/work/${source.name}`;
    }
    return new H5wasmStore(new h5wasm.File(path, "r"));
  }

  get(
    path: string,
    options?: { signal?: AbortSignal },
  ): Promise<StoreNode | null> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    const entity = path === "" ? this._file : this._file.get(path);
    if (entity instanceof h5wasm.Group) {
      return Promise.resolve(new H5wasmGroup(entity));
    }
    if (entity instanceof h5wasm.Dataset) {
      return Promise.resolve(new H5wasmArray(entity));
    }
    return Promise.resolve(null);
  }

  close(): void {
    this._file.close();
  }
}

class H5wasmGroup implements StoreGroup {
  readonly kind = "group";
  private readonly _group: Group;
  private _attrs: Record<string, unknown> | undefined;

  constructor(group: Group) {
    this._group = group;
  }

  get attrs(): Record<string, unknown> {
    return (this._attrs ??= Object.fromEntries(
      Object.entries(this._group.attrs).map(([name, attr]) => [
        name,
        attr.value,
      ]),
    ));
  }

  get keys(): string[] {
    return this._group.keys();
  }
}

class H5wasmArray implements StoreArray {
  readonly kind = "array";
  readonly shape: number[];
  readonly dataType: StoreDataType;
  private readonly _dataset: Dataset;

  constructor(dataset: Dataset) {
    const { metadata } = dataset;
    this._dataset = dataset;
    this.shape = metadata.shape ?? [];
    this.dataType = dataTypes[metadata.type] ?? "other";
  }

  read(options?: { signal?: AbortSignal }): Promise<StoreValues> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    return Promise.resolve(this._dataset.value as StoreValues);
  }

  slice(
    ranges: ([number, number] | null)[],
    options?: { signal?: AbortSignal },
  ): Promise<StoreValues> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    return Promise.resolve(
      this._dataset.slice(ranges.map((range) => range ?? [])) as StoreValues,
    );
  }
}
