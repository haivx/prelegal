import { describe, expect, it } from "vitest";
import { slugifyForFilename } from "./filename";

describe("slugifyForFilename", () => {
  it("keeps alphanumeric characters as-is", () => {
    expect(slugifyForFilename("Acme", "fallback")).toBe("Acme");
  });

  it("replaces runs of non-alphanumeric characters with a single dash", () => {
    expect(slugifyForFilename("Acme, Inc.", "fallback")).toBe("Acme-Inc");
    expect(slugifyForFilename("Beta   LLC", "fallback")).toBe("Beta-LLC");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugifyForFilename("  -Acme-  ", "fallback")).toBe("Acme");
  });

  it("falls back when the value is empty", () => {
    expect(slugifyForFilename("", "Party-1")).toBe("Party-1");
  });

  it("falls back when the value has no usable characters", () => {
    expect(slugifyForFilename("   ", "Party-1")).toBe("Party-1");
    expect(slugifyForFilename("...", "Party-1")).toBe("Party-1");
  });

  it("handles unicode letters (no usable ASCII characters) via the fallback", () => {
    expect(slugifyForFilename("株式会社", "Party-1")).toBe("Party-1");
  });
});
