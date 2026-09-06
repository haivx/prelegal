import { useMemo, type Ref } from "react";
import { renderDocumentHtml } from "@/lib/render-document";
import type { DocumentTemplate, FieldValues } from "@/types/document";

interface DocumentPreviewProps {
  template: DocumentTemplate | null;
  values: FieldValues;
  ref?: Ref<HTMLDivElement>;
}

const SIGNATURE_ROWS = ["Signature", "Print Name", "Title", "Date"];

export function DocumentPreview({ template, values, ref }: DocumentPreviewProps) {
  const html = useMemo(
    () => (template ? renderDocumentHtml(template, values) : ""),
    [template, values]
  );

  if (!template) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Tell the assistant which agreement you need and a live preview will
        appear here.
      </div>
    );
  }

  const filled = template.fields.filter(
    (label) => (values[label] ?? "").trim() !== ""
  );

  return (
    <div
      ref={ref}
      className="pdf-color-safe doc-preview mx-auto max-w-3xl space-y-6 bg-white p-8 text-sm leading-relaxed text-slate-800 print:p-0"
    >
      <header className="space-y-1 border-b border-slate-200 pb-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
        <p className="text-slate-600">{template.description}</p>
      </header>

      {filled.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">Deal Terms</h2>
          <dl className="space-y-1">
            {filled.map((label) => (
              <div key={label} className="flex gap-2">
                <dt className="font-semibold text-slate-900">{label}:</dt>
                <dd className="whitespace-pre-wrap">{values[label]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section
        className="doc-body space-y-3"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <section className="space-y-3 border-t border-slate-200 pt-4">
        <h2 className="text-base font-semibold text-slate-900">Signatures</h2>
        <table className="w-full border-collapse text-xs">
          <tbody>
            {SIGNATURE_ROWS.map((row) => (
              <tr key={row}>
                <th className="border border-slate-300 p-2 text-left font-medium text-slate-700">
                  {row}
                </th>
                <td className="border border-slate-300 p-2">&nbsp;</td>
                <td className="border border-slate-300 p-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
