import { afterEach, describe, expect, it, vi } from "vitest";

import { SourceUtils } from "./SourceUtils";

const baseUrl = "https://app.example/tm/index.html";
const projectUrl = "https://data.example/projects/p1/project.json";
const projectPath = "/proj/project.json";

type FakeFile = { kind: "file"; name: string };
type FakeDir = {
  kind: "directory";
  name: string;
  getDirectoryHandle: (name: string) => Promise<FakeDir>;
  getFileHandle: (name: string) => Promise<FakeFile>;
};

function makeFile(name: string): FakeFile {
  return { kind: "file", name };
}

function makeDir(
  name: string,
  entries: Record<string, FakeFile | FakeDir>,
  options?: { onOpen?: () => void },
): FakeDir {
  const open = (
    entryName: string,
    kind: FakeFile["kind"] | FakeDir["kind"],
  ) => {
    options?.onOpen?.();
    const entry = entries[entryName];
    if (entry === undefined) {
      return Promise.reject(
        new DOMException(`${entryName} not found`, "NotFoundError"),
      );
    }
    if (entry.kind !== kind) {
      return Promise.reject(
        new DOMException(
          `${entryName} is a ${entry.kind}`,
          "TypeMismatchError",
        ),
      );
    }
    return Promise.resolve(entry);
  };
  return {
    kind: "directory",
    name,
    getDirectoryHandle: (entryName) =>
      open(entryName, "directory") as Promise<FakeDir>,
    getFileHandle: (entryName) => open(entryName, "file") as Promise<FakeFile>,
  };
}

/**
 * /proj/project.json, /proj/points.csv, /proj/s:c.tif, /proj/sub/y.csv,
 * /shared/x.csv
 */
const pointsFile = makeFile("points.csv");
const colonFile = makeFile("s:c.tif");
const yFile = makeFile("y.csv");
const xFile = makeFile("x.csv");
const workspace = makeDir("", {
  proj: makeDir("proj", {
    "project.json": makeFile("project.json"),
    "points.csv": pointsFile,
    "s:c.tif": colonFile,
    sub: makeDir("sub", { "y.csv": yFile }),
  }),
  shared: makeDir("shared", { "x.csv": xFile }),
}) as unknown as FileSystemDirectoryHandle;

describe("SourceUtils", () => {
  describe("normalizeSource", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("throws for an empty source", () => {
      expect(() =>
        SourceUtils.normalizeSource("", workspace, projectUrl, { baseUrl }),
      ).toThrow("Empty source");
    });

    describe("URLs", () => {
      it("returns URLs with a scheme normalized, regardless of project and workspace", () => {
        expect(
          SourceUtils.normalizeSource(
            "https://x.example/a/../f.csv",
            workspace,
            projectPath,
            { baseUrl },
          ),
        ).toBe("https://x.example/f.csv");
        expect(
          SourceUtils.normalizeSource(
            "HTTPS://X.example",
            undefined,
            undefined,
            {
              baseUrl,
            },
          ),
        ).toBe("https://x.example/");
      });

      it("passes blob and data URLs through", () => {
        expect(
          SourceUtils.normalizeSource(
            "blob:https://app.example/123",
            workspace,
            projectPath,
            { baseUrl },
          ),
        ).toBe("blob:https://app.example/123");
        expect(
          SourceUtils.normalizeSource(
            "data:text/csv,a%2Cb",
            workspace,
            projectPath,
            {
              baseUrl,
            },
          ),
        ).toBe("data:text/csv,a%2Cb");
      });

      it("throws for an invalid URL", () => {
        expect(() =>
          SourceUtils.normalizeSource("http://", workspace, projectPath, {
            baseUrl,
          }),
        ).toThrow("Invalid URL: http://");
      });

      it("takes a relative path with a colon in its first segment for a URL", () => {
        expect(
          SourceUtils.normalizeSource("s:c.tif", workspace, projectPath, {
            baseUrl,
          }),
        ).toBe("s:c.tif");
      });
    });

    describe("app-relative paths", () => {
      it("resolves against the base URL", () => {
        expect(
          SourceUtils.normalizeSource(
            "//data/points.csv",
            workspace,
            projectPath,
            {
              baseUrl,
            },
          ),
        ).toBe("https://app.example/tm/data/points.csv");
      });

      it("follows URL semantics for .. and a leading /", () => {
        expect(
          SourceUtils.normalizeSource("//../points.csv", undefined, undefined, {
            baseUrl,
          }),
        ).toBe("https://app.example/points.csv");
        expect(
          SourceUtils.normalizeSource("///points.csv", undefined, undefined, {
            baseUrl,
          }),
        ).toBe("https://app.example/points.csv");
      });

      it("defaults to the document base URL", () => {
        vi.stubGlobal("document", {
          baseURI: "https://other.example/x/y.html",
        });
        expect(
          SourceUtils.normalizeSource("//points.csv", undefined, undefined),
        ).toBe("https://other.example/x/points.csv");
      });

      it("throws for an invalid base URL", () => {
        expect(() =>
          SourceUtils.normalizeSource("//points.csv", undefined, undefined, {
            baseUrl: "not a url",
          }),
        ).toThrow(TypeError);
      });
    });

    describe("workspace-relative paths", () => {
      it("collapses segments and keeps the prefix with an open workspace", () => {
        expect(
          SourceUtils.normalizeSource(
            "/shared/./sub/../x.csv",
            workspace,
            projectUrl,
            { baseUrl },
          ),
        ).toBe("/shared/x.csv");
        expect(
          SourceUtils.normalizeSource("/a//b/", workspace, undefined, {
            baseUrl,
          }),
        ).toBe("/a/b");
      });

      it("throws if the path leaves the workspace", () => {
        expect(() =>
          SourceUtils.normalizeSource("/../x.csv", workspace, undefined, {
            baseUrl,
          }),
        ).toThrow("Path escapes workspace");
        expect(() =>
          SourceUtils.normalizeSource("/a/../../x.csv", workspace, undefined, {
            baseUrl,
          }),
        ).toThrow("Path escapes workspace");
      });

      it("throws if the path names the workspace root", () => {
        expect(() =>
          SourceUtils.normalizeSource("/", workspace, undefined, { baseUrl }),
        ).toThrow("does not name a file");
        expect(() =>
          SourceUtils.normalizeSource("/./a/..", workspace, undefined, {
            baseUrl,
          }),
        ).toThrow("does not name a file");
      });

      it("falls back to being app-relative without a workspace", () => {
        expect(
          SourceUtils.normalizeSource(
            "/data/points.csv",
            undefined,
            projectUrl,
            {
              baseUrl,
            },
          ),
        ).toBe("https://app.example/tm/data/points.csv");
      });
    });

    describe("project-relative paths", () => {
      it("resolves against a project URL", () => {
        expect(
          SourceUtils.normalizeSource("points.csv", workspace, projectUrl, {
            baseUrl,
          }),
        ).toBe("https://data.example/projects/p1/points.csv");
        expect(
          SourceUtils.normalizeSource("./points.csv", undefined, projectUrl, {
            baseUrl,
          }),
        ).toBe("https://data.example/projects/p1/points.csv");
        expect(
          SourceUtils.normalizeSource(
            "../shared/x.csv",
            undefined,
            projectUrl,
            {
              baseUrl,
            },
          ),
        ).toBe("https://data.example/projects/shared/x.csv");
      });

      it("drops .. segments beyond the root of a project URL silently", () => {
        expect(
          SourceUtils.normalizeSource(
            "../../../../x.csv",
            undefined,
            projectUrl,
            {
              baseUrl,
            },
          ),
        ).toBe("https://data.example/x.csv");
      });

      it("keeps a colon in the first segment relative when prefixed with ./", () => {
        expect(
          SourceUtils.normalizeSource("./s:c.tif", undefined, projectUrl, {
            baseUrl,
          }),
        ).toBe("https://data.example/projects/p1/s:c.tif");
        expect(
          SourceUtils.normalizeSource("./s:c.tif", workspace, projectPath, {
            baseUrl,
          }),
        ).toBe("/proj/s:c.tif");
      });

      it("resolves within the project file's directory of a workspace project", () => {
        expect(
          SourceUtils.normalizeSource("points.csv", workspace, projectPath, {
            baseUrl,
          }),
        ).toBe("/proj/points.csv");
        expect(
          SourceUtils.normalizeSource(
            "./sub/../points.csv",
            workspace,
            projectPath,
            {
              baseUrl,
            },
          ),
        ).toBe("/proj/points.csv");
        expect(
          SourceUtils.normalizeSource("sub/y.csv", workspace, projectPath, {
            baseUrl,
          }),
        ).toBe("/proj/sub/y.csv");
        expect(
          SourceUtils.normalizeSource(
            "../shared/x.csv",
            workspace,
            projectPath,
            {
              baseUrl,
            },
          ),
        ).toBe("/shared/x.csv");
      });

      it("throws if the path leaves the workspace of a workspace project", () => {
        expect(() =>
          SourceUtils.normalizeSource("../../x.csv", workspace, projectPath, {
            baseUrl,
          }),
        ).toThrow("Path escapes workspace");
      });

      it("throws for a workspace project without an open workspace", () => {
        expect(() =>
          SourceUtils.normalizeSource("points.csv", undefined, projectPath, {
            baseUrl,
          }),
        ).toThrow("without workspace");
      });

      it("throws if the path does not form a valid URL with the project URL", () => {
        expect(() =>
          SourceUtils.normalizeSource("points.csv", undefined, "http://", {
            baseUrl,
          }),
        ).toThrow("Invalid project-relative path");
      });

      it("falls back to being workspace-relative without a project source", () => {
        expect(
          SourceUtils.normalizeSource("shared/x.csv", workspace, undefined, {
            baseUrl,
          }),
        ).toBe("/shared/x.csv");
      });

      it("falls back to being app-relative without a project source and workspace", () => {
        expect(
          SourceUtils.normalizeSource(
            "./data/points.csv",
            undefined,
            undefined,
            {
              baseUrl,
            },
          ),
        ).toBe("https://app.example/tm/data/points.csv");
      });
    });

    describe("idempotence", () => {
      it.each<
        [string, FileSystemDirectoryHandle | undefined, string | undefined]
      >([
        ["https://x.example/a/../f.csv", workspace, projectPath],
        ["//data/points.csv", workspace, projectPath],
        ["/shared/./x.csv", workspace, projectPath],
        ["/shared/x.csv", undefined, projectPath],
        ["./sub/../points.csv", workspace, projectPath],
        ["../shared/x.csv", workspace, projectPath],
        ["points.csv", undefined, projectUrl],
        ["shared/x.csv", workspace, undefined],
        ["points.csv", undefined, undefined],
      ])(
        "normalizes the normalized form of %s unchanged",
        (source, ws, projectSource) => {
          const normalized = SourceUtils.normalizeSource(
            source,
            ws,
            projectSource,
            {
              baseUrl,
            },
          );
          expect(
            SourceUtils.normalizeSource(normalized, ws, projectSource, {
              baseUrl,
            }),
          ).toBe(normalized);
        },
      );
    });
  });

  describe("normalizeWorkspacePath", () => {
    it("throws if the prefix is missing", () => {
      expect(() =>
        SourceUtils.normalizeWorkspacePath("x.csv", workspace, { baseUrl }),
      ).toThrow("Invalid workspace-relative path: x.csv");
    });
  });

  describe("normalizeAppPath", () => {
    it("throws if the prefix is missing", () => {
      expect(() => SourceUtils.normalizeAppPath("/x.csv", { baseUrl })).toThrow(
        "Invalid app-relative path: /x.csv",
      );
    });
  });

  describe("resolveSource", () => {
    it("returns URLs as is", async () => {
      await expect(
        SourceUtils.resolveSource("https://x.example/f.csv", workspace),
      ).resolves.toBe("https://x.example/f.csv");
      await expect(
        SourceUtils.resolveSource("blob:https://app.example/123", undefined),
      ).resolves.toBe("blob:https://app.example/123");
    });

    it("opens a file in the workspace root", async () => {
      await expect(
        SourceUtils.resolveSource("/proj/points.csv", workspace),
      ).resolves.toBe(pointsFile);
    });

    it("opens a file in nested directories", async () => {
      await expect(
        SourceUtils.resolveSource("/proj/sub/y.csv", workspace),
      ).resolves.toBe(yFile);
      await expect(
        SourceUtils.resolveSource("/proj/s:c.tif", workspace),
      ).resolves.toBe(colonFile);
    });

    it("rejects a workspace-relative path without a workspace", async () => {
      await expect(
        SourceUtils.resolveSource("/proj/points.csv", undefined),
      ).rejects.toThrow("without workspace");
    });

    it("rejects if a directory or the file does not exist", async () => {
      await expect(
        SourceUtils.resolveSource("/missing/points.csv", workspace),
      ).rejects.toMatchObject({ name: "NotFoundError" });
      await expect(
        SourceUtils.resolveSource("/proj/missing.csv", workspace),
      ).rejects.toMatchObject({ name: "NotFoundError" });
    });

    it("rejects if a segment names an entry of the wrong kind", async () => {
      await expect(
        SourceUtils.resolveSource("/proj/sub", workspace),
      ).rejects.toMatchObject({ name: "TypeMismatchError" });
      await expect(
        SourceUtils.resolveSource("/proj/points.csv/x.csv", workspace),
      ).rejects.toMatchObject({ name: "TypeMismatchError" });
    });

    it("rejects if the path leaves the workspace or names the root", async () => {
      await expect(
        SourceUtils.resolveSource("/../x.csv", workspace),
      ).rejects.toThrow("Path escapes workspace");
      await expect(SourceUtils.resolveSource("/", workspace)).rejects.toThrow(
        "does not name a file",
      );
    });

    it("rejects with the abort reason if already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      await expect(
        SourceUtils.resolveSource("/proj/points.csv", workspace, {
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("rejects with the abort reason if aborted while opening directories", async () => {
      const controller = new AbortController();
      const abortingWorkspace = makeDir(
        "",
        { proj: makeDir("proj", { "points.csv": pointsFile }) },
        { onOpen: () => controller.abort() },
      ) as unknown as FileSystemDirectoryHandle;
      await expect(
        SourceUtils.resolveSource("/proj/points.csv", abortingWorkspace, {
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("never throws synchronously", () => {
      const controller = new AbortController();
      controller.abort();
      const promises = [
        SourceUtils.resolveSource("/proj/points.csv", undefined),
        SourceUtils.resolveSource("/proj/points.csv", workspace, {
          signal: controller.signal,
        }),
        SourceUtils.resolveSource("/../x.csv", workspace),
      ];
      for (const promise of promises) {
        expect(promise).toBeInstanceOf(Promise);
        promise.catch(() => {});
      }
    });
  });
});
