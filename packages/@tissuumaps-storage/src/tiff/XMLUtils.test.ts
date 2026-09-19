// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { XMLUtils } from "./XMLUtils";

function element(xml: string): Element {
  return new DOMParser().parseFromString(xml, "application/xml")
    .documentElement;
}

describe("XMLUtils", () => {
  describe("getIntAttribute", () => {
    it("reads an integer attribute", () => {
      expect(XMLUtils.getIntAttribute(element(`<a n="3"/>`), "n", 1)).toBe(3);
    });

    it("falls back to the default for a missing attribute", () => {
      expect(XMLUtils.getIntAttribute(element(`<a/>`), "n", 1)).toBe(1);
    });

    it("falls back to the default for a value that is not an integer", () => {
      expect(XMLUtils.getIntAttribute(element(`<a n="3.7"/>`), "n", 1)).toBe(1);
      expect(XMLUtils.getIntAttribute(element(`<a n="12abc"/>`), "n", 1)).toBe(
        1,
      );
    });
  });
});
