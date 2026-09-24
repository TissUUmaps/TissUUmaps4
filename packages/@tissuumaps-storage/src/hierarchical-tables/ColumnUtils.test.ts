import { describe, expect, it } from "vitest";

import { ColumnUtils } from "./ColumnUtils";
import type { HierarchicalTableColumn } from "./HierarchicalTable";

const genes = ["CD3", "CD4", "CD8"];

const columns: HierarchicalTableColumn[] = [
  { kind: "matrix", path: "X", numColumns: 250 },
  { kind: "matrix", path: "layers/counts", numColumns: 3, selectors: genes },
  { kind: "dataset", path: "obs/_index" },
  { kind: "dataset", path: "obs/area" },
  { kind: "dataset", path: "obs/cell_type" },
  { kind: "matrix", path: "obsm/spatial", numColumns: 2 },
  { kind: "dataset", path: "var/_index" },
];

describe("ColumnUtils", () => {
  describe("parseColumnQuery", () => {
    it("parses a plain path", () => {
      expect(ColumnUtils.parseColumnQuery("obs/area")).toEqual({
        path: "obs/area",
        selector: undefined,
      });
    });

    it("strips a leading slash", () => {
      expect(ColumnUtils.parseColumnQuery("/obs/area")).toEqual({
        path: "obs/area",
        selector: undefined,
      });
    });

    it("parses a column index and a column name", () => {
      expect(ColumnUtils.parseColumnQuery("obsm/spatial[1]")).toEqual({
        path: "obsm/spatial",
        selector: "1",
      });
      expect(ColumnUtils.parseColumnQuery("X[CD3]")).toEqual({
        path: "X",
        selector: "CD3",
      });
    });

    it("rejects malformed selectors", () => {
      expect(ColumnUtils.parseColumnQuery("X[")).toBeNull();
      expect(ColumnUtils.parseColumnQuery("X[1]x")).toBeNull();
    });
  });

  describe("getMatrixSelectors", () => {
    it("uses unique names as selectors", () => {
      expect(ColumnUtils.getMatrixSelectors(genes)).toEqual(genes);
    });

    it("selects numeric, duplicate, empty and bracketed names by index", () => {
      expect(
        ColumnUtils.getMatrixSelectors(["7157", "CD3", "MATR3", "MATR3", ""]),
      ).toEqual(["0", "CD3", "2", "3", "4"]);
      expect(ColumnUtils.getMatrixSelectors(["a[1]", "b"])).toEqual(["0", "b"]);
    });
  });

  describe("resolveColumn", () => {
    it("resolves dataset columns without an index", () => {
      expect(ColumnUtils.resolveColumn(columns, "obs/area")).toEqual({
        column: columns[3],
        index: undefined,
      });
    });

    it("resolves matrix selectors to column indices", () => {
      expect(ColumnUtils.resolveColumn(columns, "X[7]")).toEqual({
        column: columns[0],
        index: 7,
      });
      expect(ColumnUtils.resolveColumn(columns, "layers/counts[CD4]")).toEqual({
        column: columns[1],
        index: 1,
      });
    });

    it("rejects indices out of range and unknown names", () => {
      expect(ColumnUtils.resolveColumn(columns, "X[250]")).toBeNull();
      expect(ColumnUtils.resolveColumn(columns, "X[CD3]")).toBeNull();
      expect(
        ColumnUtils.resolveColumn(columns, "layers/counts[CD9]"),
      ).toBeNull();
    });

    it("always reads a numeric selector as an index", () => {
      const matrix: HierarchicalTableColumn = {
        kind: "matrix",
        path: "X",
        numColumns: 3,
        selectors: ColumnUtils.getMatrixSelectors(["2", "CD3", "CD4"]),
      };
      expect(ColumnUtils.resolveColumn([matrix], "X[2]")?.index).toBe(2);
      expect(ColumnUtils.resolveColumn([matrix], "X[0]")?.index).toBe(0);
    });

    it("matches paths and names ignoring case only when unambiguous", () => {
      const matrix: HierarchicalTableColumn = {
        kind: "matrix",
        path: "X",
        numColumns: 3,
        selectors: ["Cd3", "CD3", "CD4"],
      };
      const ambiguousColumns: HierarchicalTableColumn[] = [
        matrix,
        { kind: "dataset", path: "obs/Area" },
        { kind: "dataset", path: "obs/AREA" },
        { kind: "dataset", path: "obs/type" },
      ];
      expect(ColumnUtils.resolveColumn(ambiguousColumns, "x[CD3]")).toEqual({
        column: matrix,
        index: 1,
      });
      expect(ColumnUtils.resolveColumn(ambiguousColumns, "X[cd4]")?.index).toBe(
        2,
      );
      expect(ColumnUtils.resolveColumn(ambiguousColumns, "X[cd3]")).toBeNull();
      expect(
        ColumnUtils.resolveColumn(ambiguousColumns, "obs/area"),
      ).toBeNull();
      expect(
        ColumnUtils.resolveColumn(ambiguousColumns, "OBS/TYPE")?.column,
      ).toBe(ambiguousColumns[3]);
    });
  });

  describe("suggestColumnQueries", () => {
    /** Suggestions that continue the query instead of addressing a column */
    function partial(...queries: string[]) {
      return queries.map((query) => ({ query, group: true }));
    }

    /** Suggestions that address a column */
    function complete(...queries: string[]) {
      return queries.map((query) => ({ query }));
    }

    it("lists the root children for an empty query", () => {
      // a matrix addresses a column only with a selector, so `X` is partial
      expect(ColumnUtils.suggestColumnQueries(columns, "")).toEqual(
        partial("X", "layers/", "obs/", "obsm/", "var/"),
      );
    });

    it("lists the children of a group", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "obs/")).toEqual(
        complete("obs/_index", "obs/area", "obs/cell_type"),
      );
    });

    it("filters children by the partial name, ignoring case", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "obs/ce")).toEqual(
        complete("obs/cell_type"),
      );
      expect(ColumnUtils.suggestColumnQueries(columns, "OBS/CE")).toEqual(
        complete("obs/cell_type"),
      );
      expect(ColumnUtils.suggestColumnQueries(columns, "obs")).toEqual(
        partial("obs/", "obsm/"),
      );
    });

    it("ignores a leading slash", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "/obs/ar")).toEqual(
        complete("obs/area"),
      );
    });

    it("expands a fully typed matrix to its columns", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "obsm/spatial")).toEqual(
        complete("obsm/spatial[0]", "obsm/spatial[1]"),
      );
    });

    it("filters matrix columns by the typed index", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "X[24")).toEqual(
        complete(
          "X[24]",
          "X[240]",
          "X[241]",
          "X[242]",
          "X[243]",
          "X[244]",
          "X[245]",
          "X[246]",
          "X[247]",
          "X[248]",
          "X[249]",
        ),
      );
    });

    it("suggests the names of a named matrix", () => {
      expect(
        ColumnUtils.suggestColumnQueries(columns, "layers/counts"),
      ).toEqual(
        complete(
          "layers/counts[CD3]",
          "layers/counts[CD4]",
          "layers/counts[CD8]",
        ),
      );
      expect(
        ColumnUtils.suggestColumnQueries(columns, "layers/counts[cd4"),
      ).toEqual(complete("layers/counts[CD4]"));
    });

    it("caps the number of suggested matrix columns", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "X")).toHaveLength(100);
    });

    it("returns nothing when nothing matches", () => {
      expect(ColumnUtils.suggestColumnQueries(columns, "nope/")).toEqual([]);
      expect(ColumnUtils.suggestColumnQueries(columns, "obs/area[")).toEqual(
        [],
      );
    });
  });

  describe("resolveColumnQuery", () => {
    it("resolves dataset columns", () => {
      expect(ColumnUtils.resolveColumnQuery(columns, "obs/area")).toBe(
        "obs/area",
      );
      expect(ColumnUtils.resolveColumnQuery(columns, "/obs/area")).toBe(
        "obs/area",
      );
    });

    it("resolves matrix columns within range", () => {
      expect(ColumnUtils.resolveColumnQuery(columns, "obsm/spatial[1]")).toBe(
        "obsm/spatial[1]",
      );
      expect(
        ColumnUtils.resolveColumnQuery(columns, "obsm/spatial[2]"),
      ).toBeNull();
    });

    it("resolves matrix columns by name", () => {
      expect(
        ColumnUtils.resolveColumnQuery(columns, "layers/counts[cd8]"),
      ).toBe("layers/counts[CD8]");
      expect(
        ColumnUtils.resolveColumnQuery(columns, "layers/counts[CD9]"),
      ).toBeNull();
      expect(ColumnUtils.resolveColumnQuery(columns, "X[CD3]")).toBeNull();
    });

    it("canonicalizes an index to the column's selector", () => {
      expect(ColumnUtils.resolveColumnQuery(columns, "layers/counts[1]")).toBe(
        "layers/counts[CD4]",
      );
      expect(ColumnUtils.resolveColumnQuery(columns, "X[7]")).toBe("X[7]");
    });

    it("canonicalizes the case of paths", () => {
      expect(ColumnUtils.resolveColumnQuery(columns, "OBS/Area")).toBe(
        "obs/area",
      );
    });

    it("rejects groups, bare matrices and indexed datasets", () => {
      expect(ColumnUtils.resolveColumnQuery(columns, "obs")).toBeNull();
      expect(ColumnUtils.resolveColumnQuery(columns, "obs/")).toBeNull();
      expect(ColumnUtils.resolveColumnQuery(columns, "X")).toBeNull();
      expect(ColumnUtils.resolveColumnQuery(columns, "obs/area[0]")).toBeNull();
      expect(ColumnUtils.resolveColumnQuery(columns, "X[")).toBeNull();
    });
  });
});
