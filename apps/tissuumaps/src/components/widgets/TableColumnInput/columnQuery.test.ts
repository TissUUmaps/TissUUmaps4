import { describe, expect, it } from "vitest";

import { createTable } from "@tissuumaps/core";

import { formatTableColumnQuery, splitColumnQuery } from "./columnQuery";

const own = createTable({
  id: "own",
  name: "Own",
  dataSource: { type: "test" },
});
const cells = createTable({
  id: "cells",
  name: "Cells",
  dataSource: { type: "test" },
});
const dupA = createTable({
  id: "dup-a",
  name: "Dup",
  dataSource: { type: "test" },
});
const dupB = createTable({
  id: "dup-b",
  name: "Dup",
  dataSource: { type: "test" },
});
const tables = [own, cells, dupA, dupB];

describe("columnQuery", () => {
  describe("formatTableColumnQuery", () => {
    it("formats a column of the default table by name alone", () => {
      expect(formatTableColumnQuery({ column: "gene" }, tables)).toBe("gene");
    });

    it("prefixes a uniquely named table by name", () => {
      expect(
        formatTableColumnQuery({ table: "cells", column: "gene" }, tables),
      ).toBe("Cells:gene");
    });

    it("prefixes a table sharing its name by ID", () => {
      expect(
        formatTableColumnQuery({ table: "dup-a", column: "gene" }, tables),
      ).toBe("dup-a:gene");
    });

    it("prefixes an unknown table by ID", () => {
      expect(
        formatTableColumnQuery({ table: "gone", column: "gene" }, tables),
      ).toBe("gone:gene");
    });
  });

  describe("splitColumnQuery", () => {
    it("queries the default table without a prefix", () => {
      expect(splitColumnQuery("gene", "own", tables)).toEqual({
        table: own,
        tablePrefix: "",
        columnQuery: "gene",
      });
    });

    it("queries a table by name", () => {
      expect(splitColumnQuery("Cells:gene", "own", tables)).toEqual({
        table: cells,
        tablePrefix: "Cells:",
        columnQuery: "gene",
      });
    });

    it("queries a table sharing its name by ID", () => {
      expect(splitColumnQuery("dup-b:gene", "own", tables)).toEqual({
        table: dupB,
        tablePrefix: "dup-b:",
        columnQuery: "gene",
      });
    });

    it("keeps a prefix that names no table in the column query", () => {
      expect(splitColumnQuery("Gone:gene", "own", tables)).toEqual({
        table: own,
        tablePrefix: "",
        columnQuery: "Gone:gene",
      });
    });

    it("has no table without a default table", () => {
      expect(splitColumnQuery("gene", null, tables)).toEqual({
        table: null,
        tablePrefix: "",
        columnQuery: "gene",
      });
    });
  });
});
