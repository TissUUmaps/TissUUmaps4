import { describe, expect, it } from "vitest";

import { TableColumnUtils } from "./TableColumnUtils";

describe("TableColumnUtils", () => {
  const columns = ["area", "Area_um2", "cell_type", "x", "y"];

  describe("suggestColumnQueries", () => {
    it("lists all columns for an empty query", () => {
      expect(TableColumnUtils.suggestColumnQueries(columns, "")).toEqual(
        columns,
      );
    });

    it("matches case-insensitively", () => {
      expect(TableColumnUtils.suggestColumnQueries(columns, "AREA")).toEqual([
        "area",
        "Area_um2",
      ]);
    });

    it("lists an exact match first", () => {
      expect(
        TableColumnUtils.suggestColumnQueries(["Area_um2", "area"], "area"),
      ).toEqual(["area", "Area_um2"]);
    });

    it("returns no suggestions when nothing matches", () => {
      expect(TableColumnUtils.suggestColumnQueries(columns, "z")).toEqual([]);
    });
  });

  describe("resolveColumnQuery", () => {
    it("resolves an existing column name", () => {
      expect(TableColumnUtils.resolveColumnQuery(columns, "cell_type")).toBe(
        "cell_type",
      );
    });

    it("resolves a differently cased name when it is unambiguous", () => {
      expect(TableColumnUtils.resolveColumnQuery(columns, "CELL_TYPE")).toBe(
        "cell_type",
      );
    });

    it("prefers the exactly named column over differently cased ones", () => {
      expect(
        TableColumnUtils.resolveColumnQuery(["Area", "area"], "area"),
      ).toBe("area");
    });

    it("does not resolve an ambiguous or partial name", () => {
      expect(
        TableColumnUtils.resolveColumnQuery(["Area", "AREA"], "area"),
      ).toBeNull();
      expect(TableColumnUtils.resolveColumnQuery(columns, "are")).toBeNull();
    });
  });
});
