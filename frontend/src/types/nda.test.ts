import { describe, expect, it } from "vitest";
import {
  applyNdaFieldsPatch,
  createDefaultNdaFormData,
  isReadyToDownload,
  type NdaFormData,
} from "./nda";

function withData(overrides: Partial<NdaFormData>): NdaFormData {
  return { ...createDefaultNdaFormData(), ...overrides };
}

const REQUIRED = {
  partyOneName: "Acme, Inc.",
  partyTwoName: "Beta LLC",
  purpose: "Evaluating a deal",
  effectiveDate: "2026-09-06",
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
};

describe("isReadyToDownload", () => {
  it("is false for the default (mostly empty) form data", () => {
    expect(isReadyToDownload(createDefaultNdaFormData())).toBe(false);
  });

  it("is true once every required field has a value", () => {
    expect(isReadyToDownload(withData(REQUIRED))).toBe(true);
  });

  it("is false when a required field is only whitespace", () => {
    expect(isReadyToDownload(withData({ ...REQUIRED, jurisdiction: "   " }))).toBe(
      false
    );
  });

  it("does not require the optional modifications field", () => {
    expect(
      isReadyToDownload(withData({ ...REQUIRED, modifications: "" }))
    ).toBe(true);
  });
});

describe("applyNdaFieldsPatch", () => {
  it("overlays provided values onto the current data", () => {
    const next = applyNdaFieldsPatch(createDefaultNdaFormData(), {
      partyOneName: "Acme, Inc.",
      governingLaw: "Delaware",
    });

    expect(next.partyOneName).toBe("Acme, Inc.");
    expect(next.governingLaw).toBe("Delaware");
  });

  it("ignores null and undefined values so known fields are kept", () => {
    const base = withData({ partyOneName: "Acme, Inc." });
    const next = applyNdaFieldsPatch(base, {
      partyOneName: null,
      partyTwoName: undefined,
      jurisdiction: "New Castle, DE",
    });

    expect(next.partyOneName).toBe("Acme, Inc.");
    expect(next.jurisdiction).toBe("New Castle, DE");
  });

  it("applies numeric and enum term fields", () => {
    const next = applyNdaFieldsPatch(createDefaultNdaFormData(), {
      mndaTermType: "perpetual",
      confidentialityTermYears: 5,
    });

    expect(next.mndaTermType).toBe("perpetual");
    expect(next.confidentialityTermYears).toBe(5);
  });

  it("returns a new object rather than mutating the input", () => {
    const base = createDefaultNdaFormData();
    const next = applyNdaFieldsPatch(base, { partyOneName: "Acme, Inc." });

    expect(next).not.toBe(base);
    expect(base.partyOneName).toBe("");
  });
});
