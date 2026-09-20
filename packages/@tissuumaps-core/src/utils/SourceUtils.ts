/**
 * Utility methods for resolving the `source` of data sources to URLs or file
 * handles
 *
 * A source is one of the following, tried in this order:
 *
 * 1. A URL with a scheme (e.g. `https://…`, `blob:…`, `data:…`), which is
 *    normalized and returned as is.
 * 2. An app-relative path, prefixed with `//`, resolved against the base URL
 *    of the application (e.g. `//data/points.csv`).
 * 3. A workspace-relative path, prefixed with `/`, resolved to a file handle
 *    within the open workspace (e.g. `/data/points.csv`). Without an open
 *    workspace it falls back to being app-relative.
 * 4. A project-relative path, without prefix, resolved against where the
 *    project was loaded from: a URL, or a workspace-relative path (e.g.
 *    `points.csv`, `./points.csv`, `../shared/points.csv`). Without a project
 *    source it falls back to being workspace-relative. Whenever it resolves to
 *    a workspace-relative path - against a workspace-relative project source,
 *    or through that fallback - it falls back further to being app-relative if
 *    no workspace is open.
 *
 * Resolution happens in two steps:
 *
 * 1. {@link SourceUtils.normalizeSource} classifies the source, applies the
 *    fallbacks and normalizes it, synchronously and without touching the file
 *    system. The result is either an absolute URL or a workspace-relative
 *    path. Sources referring to the same data normalize to the same string,
 *    and normalizing a normalized source yields it unchanged.
 * 2. {@link SourceUtils.resolveSource} opens the file a normalized
 *    workspace-relative path refers to. URLs need no such step and are
 *    returned as is.
 *
 * Paths use `/` as separator and may contain `.` and `..` segments. Resolving
 * against a URL follows URL semantics: `..` segments beyond the root of the
 * URL's path are dropped silently. Resolving within the workspace collapses the
 * segments and fails if the path leaves the workspace.
 *
 * A relative path whose first segment contains a colon (e.g.
 * `sample1:ch2.tif`) is taken for a URL; write it as `./sample1:ch2.tif`
 * instead.
 */
export class SourceUtils {
  private static readonly _pathSep = "/";
  private static readonly _appPathPrefix = "//";
  private static readonly _workspacePathPrefix = SourceUtils._pathSep;
  private static readonly _urlSchemePattern = /^[a-z][a-z0-9+.-]*:/i;

  /**
   * Returns whether a normalized source refers to a file within the workspace
   *
   * @param normalizedSource - The normalized source (see
   *   {@link SourceUtils.normalizeSource})
   * @returns `true` for workspace-relative paths, `false` for URLs and
   *   app-relative paths
   */
  static isWorkspacePath(normalizedSource: string): boolean {
    return (
      normalizedSource.startsWith(SourceUtils._workspacePathPrefix) &&
      !normalizedSource.startsWith(SourceUtils._appPathPrefix)
    );
  }

  /**
   * Builds a workspace-relative path from the segments of a path within the
   * workspace, as returned by `FileSystemDirectoryHandle.resolve`
   *
   * @param segments - The path segments, from the workspace root down to the
   *   file
   * @returns The workspace-relative path (with `/` prefix)
   */
  static makeWorkspacePath(segments: string[]): string {
    return (
      SourceUtils._workspacePathPrefix + segments.join(SourceUtils._pathSep)
    );
  }

  /**
   * Normalizes a source, applying the fallbacks for missing project sources
   * and workspaces
   *
   * @param source - The source to normalize
   * @param workspace - The directory handle of the open workspace, if any
   * @param projectSource - Where the project was loaded from: its absolute URL,
   *   the workspace-relative path of the project file (with `/` prefix), or
   *   `null` for projects that were loaded from neither (e.g. uploaded ones)
   * @param options - Optional base URL that app-relative paths are resolved
   *   against (default `document.baseURI`); the application relies on the
   *   default, and the option is what keeps normalization a pure function of
   *   its arguments, testable without a `document`
   * @returns The absolute URL for URLs, app-relative paths, and paths that fall
   *   back to being app-relative or resolve against a project URL; or the
   *   normalized workspace-relative path (with `/` prefix) for paths within the
   *   open workspace
   * @throws Error if the source is empty or not a valid URL, or if a
   *   project-relative path cannot be normalized (see
   *   {@link SourceUtils._normalizeProjectPath}), a workspace-relative path
   *   cannot be normalized (see {@link SourceUtils._normalizeWorkspacePath}),
   *   or an app-relative path cannot be normalized (see
   *   {@link SourceUtils._normalizeAppPath})
   */
  static normalizeSource(
    source: string,
    workspace: FileSystemDirectoryHandle | null,
    projectSource: string | null,
    options?: { baseUrl?: string },
  ): string {
    if (source === "") {
      throw new Error("Empty source");
    }
    if (SourceUtils._urlSchemePattern.test(source)) {
      if (!URL.canParse(source)) {
        throw new Error(`Invalid URL: ${source}`);
      }
      return new URL(source).toString();
    }
    if (source.startsWith(SourceUtils._appPathPrefix)) {
      return SourceUtils._normalizeAppPath(source, options);
    }
    if (source.startsWith(SourceUtils._workspacePathPrefix)) {
      return SourceUtils._normalizeWorkspacePath(source, workspace, options);
    }
    return SourceUtils._normalizeProjectPath(
      source,
      workspace,
      projectSource,
      options,
    );
  }

  /**
   * Resolves a normalized source to an absolute URL or a file handle
   *
   * URLs are returned as is, and a workspace-relative path is opened within
   * the workspace, one directory at a time, with its last segment opened as a
   * file. No fallbacks apply here: the source has to be normalized with
   * {@link SourceUtils.normalizeSource} first, using the same workspace.
   *
   * @param normalizedSource - The normalized source to resolve: an absolute URL
   *   or a workspace-relative path (with `/` prefix), as returned by
   *   {@link SourceUtils.normalizeSource}
   * @param workspace - The directory handle of the open workspace, if any
   * @param options - Optional abort signal, checked upfront and between file
   *   system calls
   * @returns A promise that resolves to the absolute URL, or to the file handle
   *   for sources that refer to a file within the workspace
   * @throws Error if a workspace-relative path is given without an open
   *   workspace, or if the path leaves the workspace or does not name a file;
   *   never thrown synchronously, the returned promise rejects instead
   * @throws DOMException if a directory or the file does not exist within the
   *   workspace (`NotFoundError`), if a segment names an entry of the wrong
   *   kind (`TypeMismatchError`), or if the operation is aborted
   *   (`AbortError`); rejected, never thrown synchronously
   */
  static async resolveSource(
    normalizedSource: string,
    workspace: FileSystemDirectoryHandle | null,
    options?: { signal?: AbortSignal },
  ): Promise<string | FileSystemFileHandle> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    if (!SourceUtils.isWorkspacePath(normalizedSource)) {
      return normalizedSource;
    }
    if (workspace === null) {
      throw new Error(
        `Cannot resolve workspace-relative path without workspace: ${normalizedSource}`,
      );
    }
    const segments = SourceUtils._collapseSegments(
      normalizedSource.substring(SourceUtils._workspacePathPrefix.length),
    );
    const fileName = segments.pop();
    if (fileName === undefined) {
      throw new Error(
        `Cannot resolve workspace-relative path that does not name a file: ${normalizedSource}`,
      );
    }
    let dir = workspace;
    for (const dirName of segments) {
      dir = await dir.getDirectoryHandle(dirName);
      signal?.throwIfAborted();
    }
    const file = await dir.getFileHandle(fileName);
    signal?.throwIfAborted();
    return file;
  }

  /**
   * Normalizes a project-relative path
   *
   * Against a project URL, the path is resolved to an absolute URL. Against a
   * workspace-relative project path, the path is resolved within the project
   * file's directory to a workspace-relative path. Without a project source,
   * the path is normalized as a workspace-relative path as is. Both of the
   * latter go through {@link SourceUtils._normalizeWorkspacePath}, including
   * its fallback for when no workspace is open.
   *
   * @param projectPath - The path relative to the project, without prefix
   * @param workspace - The directory handle of the open workspace, if any
   * @param projectSource - Where the project was loaded from: its absolute URL,
   *   the workspace-relative path of the project file (with `/` prefix), or
   *   `null` for projects that were loaded from neither (e.g. uploaded ones)
   * @param options - Optional base URL that the path is resolved against when
   *   falling back to being app-relative (default `document.baseURI`)
   * @returns The absolute URL, or the normalized workspace-relative path
   * @throws Error if the path does not form a valid URL with the project URL,
   *   if the path leaves the workspace or does not name a file, or if it
   *   cannot be normalized as a workspace-relative path (see
   *   {@link SourceUtils._normalizeWorkspacePath})
   */
  private static _normalizeProjectPath(
    projectPath: string,
    workspace: FileSystemDirectoryHandle | null,
    projectSource: string | null,
    options?: { baseUrl?: string },
  ): string {
    if (projectSource !== null) {
      if (SourceUtils._urlSchemePattern.test(projectSource)) {
        if (!URL.canParse(projectPath, projectSource)) {
          throw new Error(`Invalid project-relative path: ${projectPath}`);
        }
        return new URL(projectPath, projectSource).toString();
      }
      const projectDirSegments = SourceUtils._collapseSegments(
        projectSource.substring(SourceUtils._workspacePathPrefix.length),
      ).slice(0, -1);
      const segments = SourceUtils._collapseSegments(
        projectPath,
        projectDirSegments,
      );
      return SourceUtils._normalizeWorkspacePath(
        SourceUtils.makeWorkspacePath(segments),
        workspace,
        options,
      );
    }
    return SourceUtils._normalizeWorkspacePath(
      SourceUtils._workspacePathPrefix + projectPath,
      workspace,
      options,
    );
  }

  /**
   * Normalizes a workspace-relative path
   *
   * With an open workspace, the path's segments are collapsed and the `/`
   * prefix is kept. Without one, the path is normalized as an app-relative
   * path instead (see {@link SourceUtils._normalizeAppPath}), dropping its `/`
   * prefix: `/data/points.csv` then resolves like `//data/points.csv`.
   *
   * @param workspacePath - The path relative to the workspace root, including
   *   its `/` prefix
   * @param workspace - The directory handle of the open workspace, if any
   * @param options - Optional base URL that the path is resolved against when
   *   falling back to being app-relative (default `document.baseURI`)
   * @returns The normalized workspace-relative path, or the absolute URL if no
   *   workspace is open
   * @throws Error if the path lacks the `/` prefix, if it leaves the workspace
   *   or does not name a file, or if it does not form a valid URL with the base
   *   URL
   */
  private static _normalizeWorkspacePath(
    workspacePath: string,
    workspace: FileSystemDirectoryHandle | null,
    options?: { baseUrl?: string },
  ): string {
    if (!workspacePath.startsWith(SourceUtils._workspacePathPrefix)) {
      throw new Error(`Invalid workspace-relative path: ${workspacePath}`);
    }
    const path = workspacePath.substring(
      SourceUtils._workspacePathPrefix.length,
    );
    if (workspace !== null) {
      const segments = SourceUtils._collapseSegments(path);
      if (segments.length === 0) {
        throw new Error(
          `Workspace-relative path does not name a file: ${workspacePath}`,
        );
      }
      return SourceUtils.makeWorkspacePath(segments);
    }
    return SourceUtils._normalizeAppPath(
      SourceUtils._appPathPrefix + path,
      options,
    );
  }

  /**
   * Normalizes an app-relative path to an absolute URL
   *
   * The path is resolved against the base URL like a relative URL, so `..`
   * segments can lead above the application and a `/` right after the prefix
   * makes the path absolute within the origin.
   *
   * @param appPath - The path relative to the application, including its `//`
   *   prefix
   * @param options - Optional base URL to resolve against (default
   *   `document.baseURI`)
   * @returns The absolute URL
   * @throws Error if the path lacks the `//` prefix
   * @throws TypeError if the path does not form a valid URL with the base URL
   */
  private static _normalizeAppPath(
    appPath: string,
    options?: { baseUrl?: string },
  ): string {
    const { baseUrl = document.baseURI } = options ?? {};
    if (!appPath.startsWith(SourceUtils._appPathPrefix)) {
      throw new Error(`Invalid app-relative path: ${appPath}`);
    }
    const path = appPath.substring(SourceUtils._appPathPrefix.length);
    return new URL(path, baseUrl).toString();
  }

  /**
   * Splits a path into segments, dropping empty and `.` segments and
   * collapsing `..` segments against the segments preceding them
   *
   * @param path - The path to split, using `/` as separator
   * @param baseSegments - The segments of the directory the path is relative
   *   to, which `..` segments collapse against first (default: the root)
   * @returns The collapsed segments, empty if the path names the root itself
   * @throws Error if the path leads above the root
   */
  private static _collapseSegments(
    path: string,
    baseSegments: readonly string[] = [],
  ): string[] {
    const segments = [...baseSegments];
    for (const segment of path.split(SourceUtils._pathSep)) {
      if (segment === "" || segment === ".") {
        continue;
      }
      if (segment === "..") {
        if (segments.length === 0) {
          throw new Error(`Path escapes workspace: ${path}`);
        }
        segments.pop();
      } else {
        segments.push(segment);
      }
    }
    return segments;
  }
}
