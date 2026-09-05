import type { ReactNode, Ref } from "react";
import type { NdaFormData } from "@/types/nda";
import {
  confidentialityTermText,
  formatLongDate,
  governingLawText,
  jurisdictionText,
  mndaTermText,
  partyOneText,
  partyTwoText,
  purposeText,
} from "@/lib/nda-text";

interface NdaDocumentProps {
  data: NdaFormData;
  ref?: Ref<HTMLDivElement>;
}

/** Highlights a value that was filled in from the form. */
function Filled({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-2">
      {children}
    </span>
  );
}

function Clause({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="break-inside-avoid pl-1 marker:font-semibold marker:text-slate-500">
      <span className="font-semibold text-slate-900">{title}.</span>{" "}
      {children}
    </li>
  );
}

export function NdaDocument({ data, ref }: NdaDocumentProps) {
  const purpose = purposeText(data);
  const effectiveDate = formatLongDate(data.effectiveDate);
  const mndaTerm = mndaTermText(data);
  const confidentialityTerm = confidentialityTermText(data);
  const governingLaw = governingLawText(data);
  const jurisdiction = jurisdictionText(data);
  const partyOne = partyOneText(data);
  const partyTwo = partyTwoText(data);

  return (
    <div
      ref={ref}
      className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-sm leading-relaxed text-slate-800 print:p-0"
    >
      <header className="break-inside-avoid space-y-1 text-center">
        <h1 className="text-xl font-bold text-slate-900">
          Mutual Non-Disclosure Agreement
        </h1>
        <p className="text-slate-600">
          Between <Filled>{partyOne}</Filled> and <Filled>{partyTwo}</Filled>
        </p>
      </header>

      <section className="break-inside-avoid space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Cover Page
        </h2>
        <p>
          This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;)
          consists of: (1) this Cover Page (&ldquo;Cover Page&rdquo;) and (2)
          the Common Paper Mutual NDA Standard Terms Version 1.0
          (&ldquo;Standard Terms&rdquo;) identical to those posted at{" "}
          <a
            className="text-slate-600 underline"
            href="https://commonpaper.com/standards/mutual-nda/1.0"
          >
            commonpaper.com/standards/mutual-nda/1.0
          </a>
          . Any modifications of the Standard Terms are made below, which
          control over conflicts with the Standard Terms.
        </p>

        <dl className="space-y-3">
          <div>
            <dt className="font-semibold text-slate-900">Purpose</dt>
            <dd>
              <Filled>{purpose}</Filled>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">Effective Date</dt>
            <dd>
              <Filled>{effectiveDate}</Filled>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">MNDA Term</dt>
            <dd>
              <Filled>{mndaTerm}</Filled>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">
              Term of Confidentiality
            </dt>
            <dd>
              <Filled>{confidentialityTerm}</Filled>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-900">
              Governing Law &amp; Jurisdiction
            </dt>
            <dd>
              Governing Law: <Filled>{governingLaw}</Filled>
              <br />
              Jurisdiction: <Filled>{jurisdiction}</Filled>
            </dd>
          </div>
          {data.modifications.trim() && (
            <div>
              <dt className="font-semibold text-slate-900">
                MNDA Modifications
              </dt>
              <dd className="whitespace-pre-wrap">
                <Filled>{data.modifications.trim()}</Filled>
              </dd>
            </div>
          )}
        </dl>

        <p>
          By signing below, each party agrees to enter into this MNDA as of
          the Effective Date.
        </p>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-slate-300 bg-slate-50 p-2 text-left"></th>
              <th className="border border-slate-300 bg-slate-50 p-2 text-left">
                Party 1
              </th>
              <th className="border border-slate-300 bg-slate-50 p-2 text-left">
                Party 2
              </th>
            </tr>
          </thead>
          <tbody>
            {["Signature", "Print Name", "Title", "Company", "Notice Address", "Date"].map(
              (row) => (
                <tr key={row}>
                  <th className="border border-slate-300 p-2 text-left font-medium text-slate-700">
                    {row}
                  </th>
                  <td className="border border-slate-300 p-2">&nbsp;</td>
                  <td className="border border-slate-300 p-2">&nbsp;</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="break-inside-avoid text-base font-semibold text-slate-900">
          Standard Terms
        </h2>
        <ol className="list-decimal space-y-3 pl-5">
          <Clause title="Introduction">
            This Mutual Non-Disclosure Agreement (which incorporates these
            Standard Terms and the Cover Page above) (&ldquo;MNDA&rdquo;)
            allows each party (&ldquo;Disclosing Party&rdquo;) to disclose or
            make available information in connection with the{" "}
            <Filled>{purpose}</Filled> which (1) the Disclosing Party
            identifies to the receiving party (&ldquo;Receiving
            Party&rdquo;) as &ldquo;confidential&rdquo;,
            &ldquo;proprietary&rdquo;, or the like or (2) should be
            reasonably understood as confidential or proprietary due to its
            nature and the circumstances of its disclosure
            (&ldquo;Confidential Information&rdquo;). Each party&rsquo;s
            Confidential Information also includes the existence and status
            of the parties&rsquo; discussions and information on the Cover
            Page. Confidential Information includes technical or business
            information, product designs or roadmaps, requirements, pricing,
            security and compliance documentation, technology, inventions
            and know-how. Each party is identified above and capitalized
            terms have the meanings given herein or on the Cover Page.
          </Clause>
          <Clause title="Use and Protection of Confidential Information">
            The Receiving Party shall: (a) use Confidential Information
            solely for the <Filled>{purpose}</Filled>; (b) not disclose
            Confidential Information to third parties without the
            Disclosing Party&rsquo;s prior written approval, except that the
            Receiving Party may disclose Confidential Information to its
            employees, agents, advisors, contractors and other
            representatives having a reasonable need to know for the{" "}
            <Filled>{purpose}</Filled>, provided these representatives are
            bound by confidentiality obligations no less protective of the
            Disclosing Party than the applicable terms in this MNDA and the
            Receiving Party remains responsible for their compliance with
            this MNDA; and (c) protect Confidential Information using at
            least the same protections the Receiving Party uses for its own
            similar information but no less than a reasonable standard of
            care.
          </Clause>
          <Clause title="Exceptions">
            The Receiving Party&rsquo;s obligations in this MNDA do not
            apply to information that it can demonstrate: (a) is or becomes
            publicly available through no fault of the Receiving Party; (b)
            it rightfully knew or possessed prior to receipt from the
            Disclosing Party without confidentiality restrictions; (c) it
            rightfully obtained from a third party without confidentiality
            restrictions; or (d) it independently developed without using
            or referencing the Confidential Information.
          </Clause>
          <Clause title="Disclosures Required by Law">
            The Receiving Party may disclose Confidential Information to
            the extent required by law, regulation or regulatory authority,
            subpoena or court order, provided (to the extent legally
            permitted) it provides the Disclosing Party reasonable advance
            notice of the required disclosure and reasonably cooperates, at
            the Disclosing Party&rsquo;s expense, with the Disclosing
            Party&rsquo;s efforts to obtain confidential treatment for the
            Confidential Information.
          </Clause>
          <Clause title="Term and Termination">
            This MNDA commences on the <Filled>{effectiveDate}</Filled> and
            expires at the end of the MNDA Term (
            <Filled>{mndaTerm}</Filled>). Either party may terminate this
            MNDA for any or no reason upon written notice to the other
            party. The Receiving Party&rsquo;s obligations relating to
            Confidential Information will survive for the Term of
            Confidentiality (<Filled>{confidentialityTerm}</Filled>),
            despite any expiration or termination of this MNDA.
          </Clause>
          <Clause title="Return or Destruction of Confidential Information">
            Upon expiration or termination of this MNDA or upon the
            Disclosing Party&rsquo;s earlier request, the Receiving Party
            will: (a) cease using Confidential Information; (b) promptly
            after the Disclosing Party&rsquo;s written request, destroy all
            Confidential Information in the Receiving Party&rsquo;s
            possession or control or return it to the Disclosing Party; and
            (c) if requested by the Disclosing Party, confirm its
            compliance with these obligations in writing. As an exception
            to subsection (b), the Receiving Party may retain Confidential
            Information in accordance with its standard backup or record
            retention policies or as required by law, but the terms of this
            MNDA will continue to apply to the retained Confidential
            Information.
          </Clause>
          <Clause title="Proprietary Rights">
            The Disclosing Party retains all of its intellectual property
            and other rights in its Confidential Information and its
            disclosure to the Receiving Party grants no license under such
            rights.
          </Clause>
          <Clause title="Disclaimer">
            ALL CONFIDENTIAL INFORMATION IS PROVIDED &ldquo;AS IS&rdquo;,
            WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED
            WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A
            PARTICULAR PURPOSE.
          </Clause>
          <Clause title="Governing Law and Jurisdiction">
            This MNDA and all matters relating hereto are governed by, and
            construed in accordance with, the laws of the State of{" "}
            <Filled>{governingLaw}</Filled>, without regard to the conflict
            of laws provisions of such state. Any legal suit, action, or
            proceeding relating to this MNDA must be instituted in the
            federal or state <Filled>{jurisdiction}</Filled>. Each party
            irrevocably submits to the exclusive jurisdiction of such{" "}
            <Filled>{jurisdiction}</Filled> in any such suit, action, or
            proceeding.
          </Clause>
          <Clause title="Equitable Relief">
            A breach of this MNDA may cause irreparable harm for which
            monetary damages are an insufficient remedy. Upon a breach of
            this MNDA, the Disclosing Party is entitled to seek appropriate
            equitable relief, including an injunction, in addition to its
            other remedies.
          </Clause>
          <Clause title="General">
            Neither party has an obligation under this MNDA to disclose
            Confidential Information to the other or proceed with any
            proposed transaction. Neither party may assign this MNDA
            without the prior written consent of the other party, except
            that either party may assign this MNDA in connection with a
            merger, reorganization, acquisition or other transfer of all or
            substantially all its assets or voting securities. Any
            assignment in violation of this Section is null and void. This
            MNDA will bind and inure to the benefit of each party&rsquo;s
            permitted successors and assigns. Waivers must be signed by the
            waiving party&rsquo;s authorized representative and cannot be
            implied from conduct. If any provision of this MNDA is held
            unenforceable, it will be limited to the minimum extent
            necessary so the rest of this MNDA remains in effect. This
            MNDA (including the Cover Page) constitutes the entire
            agreement of the parties with respect to its subject matter,
            and supersedes all prior and contemporaneous understandings,
            agreements, representations, and warranties, whether written or
            oral, regarding such subject matter. This MNDA may only be
            amended, modified, waived, or supplemented by an agreement in
            writing signed by both parties. Notices, requests and approvals
            under this MNDA must be sent in writing to the email or postal
            addresses on the Cover Page and are deemed delivered on
            receipt. This MNDA may be executed in counterparts, including
            electronic copies, each of which is deemed an original and
            which together form the same agreement.
          </Clause>
        </ol>
      </section>

      <footer className="break-inside-avoid border-t border-slate-200 pt-3 text-xs text-slate-500">
        Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to
        use under{" "}
        <a
          className="underline"
          href="https://creativecommons.org/licenses/by/4.0/"
        >
          CC BY 4.0
        </a>
        .
      </footer>
    </div>
  );
}
