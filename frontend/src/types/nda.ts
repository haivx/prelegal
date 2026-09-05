export type MndaTermType = "expires" | "perpetual";
export type ConfidentialityTermType = "years" | "perpetuity";

export interface NdaFormData {
  partyOneName: string;
  partyTwoName: string;
  purpose: string;
  effectiveDate: string; // ISO date string, e.g. "2026-09-05"
  mndaTermType: MndaTermType;
  mndaTermYears: number;
  confidentialityTermType: ConfidentialityTermType;
  confidentialityTermYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultNdaFormData(): NdaFormData {
  return {
    partyOneName: "",
    partyTwoName: "",
    purpose:
      "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate: todayIso(),
    mndaTermType: "expires",
    mndaTermYears: 1,
    confidentialityTermType: "years",
    confidentialityTermYears: 1,
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
  };
}
