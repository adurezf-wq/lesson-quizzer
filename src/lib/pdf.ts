import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// Vite will resolve this worker URL at build time
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

export async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => (typeof i?.str === "string" ? i.str : ""))
      .filter(Boolean);
    fullText += strings.join(" ") + "\n\n";
  }

  // Normalize whitespace
  return fullText.replace(/\s+/g, " ").trim();
}
