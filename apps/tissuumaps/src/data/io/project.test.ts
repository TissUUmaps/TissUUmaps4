import { describe, expect, it, vi } from "vitest";

import { resolveProjectSource } from "./project";

const projectFile = {
  kind: "file",
  name: "project.tmap",
} as FileSystemFileHandle;

/**
 * Creates a workspace whose `resolve` returns the given segments, standing in
 * for a directory tree that does or does not contain the project file
 */
function makeWorkspace(segments: string[] | null) {
  const resolve = vi.fn(() => Promise.resolve(segments));
  const workspace = { kind: "directory", name: "", resolve };
  return {
    resolve,
    workspace: workspace as unknown as FileSystemDirectoryHandle,
  };
}

describe("resolveProjectSource", () => {
  it("returns the workspace-relative path of a file in the workspace", async () => {
    const { workspace, resolve } = makeWorkspace(["study", "project.tmap"]);
    await expect(resolveProjectSource(projectFile, workspace)).resolves.toBe(
      "/study/project.tmap",
    );
    expect(resolve).toHaveBeenCalledWith(projectFile);
  });

  it("returns the path of a file in the workspace root", async () => {
    const { workspace } = makeWorkspace(["project.tmap"]);
    await expect(resolveProjectSource(projectFile, workspace)).resolves.toBe(
      "/project.tmap",
    );
  });

  it("returns null for a file outside the workspace", async () => {
    const { workspace } = makeWorkspace(null);
    await expect(
      resolveProjectSource(projectFile, workspace),
    ).resolves.toBeNull();
  });

  it("returns null without an open workspace, without resolving", async () => {
    const { resolve } = makeWorkspace(["project.tmap"]);
    await expect(resolveProjectSource(projectFile, null)).resolves.toBeNull();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("throws if aborted before resolving", async () => {
    const { workspace, resolve } = makeWorkspace(["project.tmap"]);
    await expect(
      resolveProjectSource(projectFile, workspace, {
        signal: AbortSignal.abort(),
      }),
    ).rejects.toThrow();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("throws if aborted while resolving", async () => {
    const abortController = new AbortController();
    const resolve = vi.fn(() => {
      abortController.abort();
      return Promise.resolve(["project.tmap"]);
    });
    const workspace = {
      kind: "directory",
      name: "",
      resolve,
    } as unknown as FileSystemDirectoryHandle;
    await expect(
      resolveProjectSource(projectFile, workspace, {
        signal: abortController.signal,
      }),
    ).rejects.toThrow();
  });
});
