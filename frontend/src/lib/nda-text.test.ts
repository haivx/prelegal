import { describe, expect, it } from "vitest";
import {
  confidentialityTermText,
  formatLongDate,
  governingLawText,
  jurisdictionText,
  mndaTermText,
  partyOneText,
  partyTwoText,
  purposeText,
} from "./nda-text";
import { createDefaultNdaFormData, type NdaFormData } from "@/types/nda";

function withData(overrides: Partial<NdaFormData>): NdaFormData {
  return { ...createDefaultNdaFormData(), ...overrides };
}

describe("formatLongDate", () => {
  it("formats an ISO date as a long-form US date", () => {
    expect(formatLongDate("2026-09-05")).toBe("September 5, 2026");
  });

  it("falls back to a placeholder for an empty string", () => {
    expect(formatLongDate("")).toBe("[Effective Date]");
  });

  it("falls back to a placeholder for an unparseable date", () => {
    expect(formatLongDate("not-a-date")).toBe("[Effective Date]");
  });
});

describe("purposeText", () => {
  it("returns the trimmed purpose when provided", () => {
    expect(purposeText(withData({ purpose: "  Evaluate a partnership.  " }))).toBe(
      "Evaluate a partnership."
    );
  });

  it("falls back to a placeholder when blank", () => {
    expect(purposeText(withData({ purpose: "   " }))).toBe("[Purpose]");
  });
});

describe("mndaTermText", () => {
  it("describes a fixed-year term", () => {
    expect(
      mndaTermText(withData({ mndaTermType: "expires", mndaTermYears: 2 }))
    ).toBe("2 year(s) from the Effective Date");
  });

  it("describes a perpetual term", () => {
    expect(mndaTermText(withData({ mndaTermType: "perpetual" }))).toBe(
      "Continues until terminated in accordance with the terms of the MNDA"
    );
  });
});

describe("confidentialityTermText", () => {
  it("describes a fixed-year confidentiality term", () => {
    expect(
      confidentialityTermText(
        withData({ confidentialityTermType: "years", confidentialityTermYears: 3 })
      )
    ).toBe(
      "3 year(s) from the Effective Date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable law"
    );
  });

  it("describes a perpetuity confidentiality term", () => {
    expect(
      confidentialityTermText(withData({ confidentialityTermType: "perpetuity" }))
    ).toBe("In perpetuity");
  });
});

describe("governingLawText / jurisdictionText", () => {
  it("returns the trimmed value when provided", () => {
    expect(governingLawText(withData({ governingLaw: " Delaware " }))).toBe(
      "Delaware"
    );
    expect(
      jurisdictionText(withData({ jurisdiction: " courts located in New Castle, DE " }))
    ).toBe("courts located in New Castle, DE");
  });

  it("falls back to a placeholder when blank", () => {
    expect(governingLawText(withData({ governingLaw: "" }))).toBe(
      "[Governing Law]"
    );
    expect(jurisdictionText(withData({ jurisdiction: "" }))).toBe(
      "[Jurisdiction]"
    );
  });
});

describe("partyOneText / partyTwoText", () => {
  it("returns the trimmed party name when provided", () => {
    expect(partyOneText(withData({ partyOneName: " Acme, Inc. " }))).toBe(
      "Acme, Inc."
    );
    expect(partyTwoText(withData({ partyTwoName: " Beta LLC " }))).toBe(
      "Beta LLC"
    );
  });

  it("falls back to a bracketed placeholder when blank", () => {
    expect(partyOneText(withData({ partyOneName: "" }))).toBe("[Party 1]");
    expect(partyTwoText(withData({ partyTwoName: "" }))).toBe("[Party 2]");
  });
});
