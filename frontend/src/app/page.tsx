"use client";

import { useRef, useState } from "react";
import { NdaForm } from "@/components/nda-form";
import { NdaDocument } from "@/components/nda-document";
import { downloadElementAsPdf } from "@/lib/download-pdf";
import { createDefaultNdaFormData, type NdaFormData } from "@/types/nda";

function slugifyForFilename(value: string, fallback: string): string {
  const slug = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export default function Home() {
  const [data, setData] = useState<NdaFormData>(createDefaultNdaFormData());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentRef.current) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const partyOneSlug = slugifyForFilename(data.partyOneName, "Party-1");
      const partyTwoSlug = slugifyForFilename(data.partyTwoName, "Party-2");
      const filename = `Mutual-NDA-${partyOneSlug}-${partyTwoSlug}.pdf`;
      await downloadElementAsPdf(documentRef.current, filename);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setDownloadError(
        "Something went wrong generating the PDF. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Mutual NDA Creator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Fill in the key details below to generate a Common Paper Mutual
            Non-Disclosure Agreement, previewed live and ready to download as
            a PDF.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8 lg:h-fit">
            <NdaForm data={data} onChange={setData} />

            <div className="mt-8 border-t border-slate-200 pt-6">
              <button
                type="submit"
                disabled={isDownloading}
                className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? "Preparing PDF…" : "Download PDF"}
              </button>
              {downloadError && (
                <p className="mt-2 text-sm text-red-600">{downloadError}</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
              <NdaDocument data={data} ref={documentRef} />
            </div>
          </section>
        </main>
      </form>
    </div>
  );
}
