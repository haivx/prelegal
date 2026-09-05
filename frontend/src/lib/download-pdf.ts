/**
 * Renders a DOM element to a PDF and prompts the browser to download it.
 * html2pdf.js only runs in the browser, so it is imported dynamically to
 * keep it out of the server bundle.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const { default: html2pdf } = await import("html2pdf.js");

  await html2pdf()
    .set({
      margin: 0.5,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    })
    .from(element)
    .save();
}
