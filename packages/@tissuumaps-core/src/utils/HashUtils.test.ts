import { describe, expect, it } from "vitest";

import { HashUtils } from "./HashUtils";

describe("HashUtils", () => {
  it("returns 5381 for an empty string", () => {
    expect(HashUtils.djb2("")).toBe(5381);
  });

  it("returns known hash values", () => {
    expect(HashUtils.djb2("a")).toBe(177670);
    expect(HashUtils.djb2("abc")).toBe(193485963);
    expect(HashUtils.djb2("hello")).toBe(261238937);
  });

  it("is deterministic", () => {
    const str = "test-string";
    expect(HashUtils.djb2(str)).toBe(HashUtils.djb2(str));
  });

  it("produces different hashes for different strings", () => {
    expect(HashUtils.djb2("abc")).not.toBe(HashUtils.djb2("def"));
    expect(HashUtils.djb2("12345")).not.toBe(HashUtils.djb2("54321"));
  });

  it("always returns a non-negative 32-bit integer", () => {
    for (const str of ["", "hello", "你好", "a".repeat(1000), "!@#$%^&*()"]) {
      const hash = HashUtils.djb2(str);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
