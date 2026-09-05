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
  // Build the date from local parts rather than `toISOString()`, which
  // converts to UTC first and would show tomorrow's date to anyone west of
  // UTC during evening/night local hours.
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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
