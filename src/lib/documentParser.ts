/**
 * Document parsing: extract text from PDF, DOC, DOCX, TXT, MD files for Coze AI processing.
 * Ensures uploaded document content is correctly transmitted to the AI.
 */

const MAX_TEXT_LENGTH = 30_000;

function truncate(text: string): string {
  return text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + "\n\n[... document too long, truncated ...]"
    : text;
}

/**
 * Extract text content from a File.
 * Supports: PDF, DOCX, DOC, TXT, MD
 * @returns Extracted text, or undefined on failure
 */
export async function extractTextFromFile(file: File): Promise<string | undefined> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  console.log("[documentParser] parsing file: name=%s ext=%s size=%d", file.name, ext, file.size);

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    console.error("[documentParser] failed to read file buffer:", file.name, err);
    return undefined;
  }

  try {
    let text: string | undefined;
    if (ext === "pdf") {
      text = await extractTextFromPdf(buffer);
    } else if (ext === "docx") {
      text = await extractTextFromDocx(buffer);
    } else if (ext === "doc") {
      text = await extractTextFromDoc(buffer);
    } else if (ext === "txt" || ext === "md") {
      text = truncate(buffer.toString("utf-8"));
    } else {
      console.warn("[documentParser] unsupported file type:", ext, file.name);
      return undefined;
    }
    console.log("[documentParser] extraction result: ext=%s textLength=%d", ext, text?.length ?? 0);
    return text;
  } catch (err) {
    console.error("[documentParser] extract FAILED for:", file.name, "ext:", ext, "error:", err);
    return undefined;
  }
}

async function extractTextFromPdf(buffer: Buffer): Promise<string | undefined> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    await parser.destroy();
    const text = result?.text?.trim();
    if (!text) return undefined;
    return truncate(text);
  } catch (err) {
    await parser.destroy().catch(() => {});
    throw err;
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string | undefined> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value?.trim();
  if (!text) return undefined;
  return truncate(text);
}

async function extractTextFromDoc(buffer: Buffer): Promise<string | undefined> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const text = doc.getBody()?.trim();
  if (!text) return undefined;
  return truncate(text);
}
