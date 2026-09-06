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

/**
 * Fields the AI chat must fill in before the NDA is worth downloading. The
 * term fields are left out because they always carry a sensible default.
 * Kept in sync with the backend's REQUIRED_FIELDS in `app/llm.py`.
 */
export const REQUIRED_FIELDS = [
  "partyOneName",
  "partyTwoName",
  "purpose",
  "effectiveDate",
  "governingLaw",
  "jurisdiction",
] as const satisfies readonly (keyof NdaFormData)[];

/** True once every required field has a non-blank value. */
export function isReadyToDownload(data: NdaFormData): boolean {
  return REQUIRED_FIELDS.every((key) => data[key].trim() !== "");
}

/**
 * A partial set of NDA fields as returned by the AI chat: any key may be
 * absent or `null` to mean "still unknown, leave the current value alone".
 */
export type NdaFieldsPatch = Partial<{
  [K in keyof NdaFormData]: NdaFormData[K] | null;
}>;

/** Overlay the non-null values from a chat patch onto the current data. */
export function applyNdaFieldsPatch(
  data: NdaFormData,
  patch: NdaFieldsPatch
): NdaFormData {
  const filled = Object.entries(patch).filter(
    ([, value]) => value !== null && value !== undefined
  );
  return { ...data, ...Object.fromEntries(filled) } as NdaFormData;
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
