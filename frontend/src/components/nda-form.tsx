"use client";

import type { NdaFormData } from "@/types/nda";

interface NdaFormProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}

const inputClasses =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelClasses = "block text-sm font-medium text-slate-700";
const hintClasses = "mt-1 text-xs text-slate-500";

export function NdaForm({ data, onChange }: NdaFormProps) {
  function set<K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-slate-900">
          Parties
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClasses} htmlFor="partyOneName">
              Party 1 name
            </label>
            <input
              id="partyOneName"
              className={inputClasses}
              type="text"
              required
              placeholder="Acme, Inc."
              value={data.partyOneName}
              onChange={(e) => set("partyOneName", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClasses} htmlFor="partyTwoName">
              Party 2 name
            </label>
            <input
              id="partyTwoName"
              className={inputClasses}
              type="text"
              required
              placeholder="Beta LLC"
              value={data.partyTwoName}
              onChange={(e) => set("partyTwoName", e.target.value)}
            />
          </div>
        </div>
        <p className={hintClasses}>
          Signature, printed name, title, and date are left blank in the
          generated document for the parties to sign by hand.
        </p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-slate-900">
          Purpose
        </legend>
        <div>
          <label className={labelClasses} htmlFor="purpose">
            How Confidential Information may be used
          </label>
          <textarea
            id="purpose"
            className={inputClasses}
            rows={2}
            required
            value={data.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-slate-900">
          Dates &amp; Terms
        </legend>
        <div>
          <label className={labelClasses} htmlFor="effectiveDate">
            Effective date
          </label>
          <input
            id="effectiveDate"
            className={inputClasses}
            type="date"
            required
            value={data.effectiveDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </div>

        <div>
          <span className={labelClasses}>MNDA term</span>
          <p className={hintClasses}>The length of this MNDA.</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mndaTermType"
                checked={data.mndaTermType === "expires"}
                onChange={() => set("mndaTermType", "expires")}
              />
              Expires
              <input
                className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="number"
                min={1}
                disabled={data.mndaTermType !== "expires"}
                value={data.mndaTermYears}
                onChange={(e) =>
                  set("mndaTermYears", Number(e.target.value) || 1)
                }
              />
              year(s) from Effective Date
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mndaTermType"
                checked={data.mndaTermType === "perpetual"}
                onChange={() => set("mndaTermType", "perpetual")}
              />
              Continues until terminated in accordance with the terms of the
              MNDA
            </label>
          </div>
        </div>

        <div>
          <span className={labelClasses}>Term of confidentiality</span>
          <p className={hintClasses}>
            How long Confidential Information is protected.
          </p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="confidentialityTermType"
                checked={data.confidentialityTermType === "years"}
                onChange={() => set("confidentialityTermType", "years")}
              />
              <input
                className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="number"
                min={1}
                disabled={data.confidentialityTermType !== "years"}
                value={data.confidentialityTermYears}
                onChange={(e) =>
                  set(
                    "confidentialityTermYears",
                    Number(e.target.value) || 1
                  )
                }
              />
              year(s) from Effective Date (trade secrets protected until no
              longer a trade secret)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="confidentialityTermType"
                checked={data.confidentialityTermType === "perpetuity"}
                onChange={() => set("confidentialityTermType", "perpetuity")}
              />
              In perpetuity
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-slate-900">
          Governing Law &amp; Jurisdiction
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClasses} htmlFor="governingLaw">
              Governing law (state)
            </label>
            <input
              id="governingLaw"
              className={inputClasses}
              type="text"
              required
              placeholder="Delaware"
              value={data.governingLaw}
              onChange={(e) => set("governingLaw", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClasses} htmlFor="jurisdiction">
              Jurisdiction
            </label>
            <input
              id="jurisdiction"
              className={inputClasses}
              type="text"
              required
              placeholder="courts located in New Castle, DE"
              value={data.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-slate-900">
          MNDA Modifications{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </legend>
        <textarea
          className={inputClasses}
          rows={3}
          placeholder="List any modifications to the MNDA"
          value={data.modifications}
          onChange={(e) => set("modifications", e.target.value)}
        />
      </fieldset>
    </div>
  );
}
