import type { NdaFormData } from "@/types/nda";

/**
 * Derives the human-readable strings that get substituted into the MNDA
 * cover page and standard terms wherever the source template references a
 * cover-page-defined value (e.g. the `coverpage_link` spans in
 * templates/Mutual-NDA.md).
 */

export function formatLongDate(isoDate: string): string {
  if (!isoDate) return "[Effective Date]";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "[Effective Date]";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function purposeText(data: NdaFormData): string {
  return data.purpose.trim() || "[Purpose]";
}

export function mndaTermText(data: NdaFormData): string {
  return data.mndaTermType === "expires"
    ? `${data.mndaTermYears} year(s) from the Effective Date`
    : "Continues until terminated in accordance with the terms of the MNDA";
}

export function confidentialityTermText(data: NdaFormData): string {
  return data.confidentialityTermType === "years"
    ? `${data.confidentialityTermYears} year(s) from the Effective Date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable law`
    : "In perpetuity";
}

export function governingLawText(data: NdaFormData): string {
  return data.governingLaw.trim() || "[Governing Law]";
}

export function jurisdictionText(data: NdaFormData): string {
  return data.jurisdiction.trim() || "[Jurisdiction]";
}

export function partyOneText(data: NdaFormData): string {
  return data.partyOneName.trim() || "[Party 1]";
}

export function partyTwoText(data: NdaFormData): string {
  return data.partyTwoName.trim() || "[Party 2]";
}
