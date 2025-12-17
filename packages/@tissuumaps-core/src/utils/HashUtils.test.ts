import { describe, expect, it } from "vitest";

import { HashUtils } from "./HashUtils";

describe("HashUtils", () => {
  it("should return 0 for empty string", () => {
    expect(HashUtils.djb2("")).toBe(0);
  });

  it("should return the same hash for the same string", () => {
    const str = "test-string";
    expect(HashUtils.djb2(str)).toBe(HashUtils.djb2(str));
  });

  it("should return different hashes for different strings", () => {
    expect(HashUtils.djb2("abc")).not.toBe(HashUtils.djb2("def"));
  });

  it("should handle unicode characters", () => {
    expect(typeof HashUtils.djb2("你好")).toBe("number");
    expect(HashUtils.djb2("你好")).not.toBe(HashUtils.djb2("hello"));
  });

  it("should handle long strings", () => {
    const longStr = "a".repeat(1000);
    expect(typeof HashUtils.djb2(longStr)).toBe("number");
  });

  it("should handle strings with special characters", () => {
    const special = "!@#$%^&*()_+-=[]{}|;':\",.<>/?`~";
    expect(typeof HashUtils.djb2(special)).toBe("number");
  });

  it("should handle numeric strings", () => {
    expect(HashUtils.djb2("12345")).not.toBe(HashUtils.djb2("54321"));
  });
});
