import { describe, expect, it } from "vitest";

import { TableColumnUtils } from "./TableColumnUtils";

describe("TableColumnUtils", () => {
  const columns = ["area", "Area_um2", "cell_type", "x", "y"];

  function terminal(...queries: string[]) {
    return queries.map((query) => ({ query, terminal: true }));
  }

  describe("matchColumnQuery", () => {
    it("matches case-insensitively on containment", () => {
      expect(TableColumnUtils.matchColumnQuery("Area_um2", "area")).toBe(0);
      expect(TableColumnUtils.matchColumnQuery("cell_type", "TYPE")).toBe(5);
      expect(TableColumnUtils.matchColumnQuery("x", "y")).toBe(-1);
    });
  });

  describe("suggestColumnQueries", () => {
    it("lists all columns for an empty query", () => {
      expect(TableColumnUtils.suggestColumnQueries(columns, "")).toEqual(
        terminal(...columns),
      );
    });

    it("lists case-insensitive matches first", () => {
      expect(TableColumnUtils.suggestColumnQueries(columns, "AREA")).toEqual(
        terminal("area", "Area_um2", "cell_type", "x", "y"),
      );
    });

    it("lists an exact match first", () => {
      expect(
        TableColumnUtils.suggestColumnQueries(["Area_um2", "area"], "area"),
      ).toEqual(terminal("area", "Area_um2"));
    });

    it("lists all columns in table order when nothing matches", () => {
      expect(TableColumnUtils.suggestColumnQueries(columns, "z")).toEqual(
        terminal(...columns),
      );
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
