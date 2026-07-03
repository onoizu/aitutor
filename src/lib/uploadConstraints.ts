export type UploadedAttachmentKind = "image" | "document";

export interface UploadedAttachment {
  id: string;
  kind: UploadedAttachmentKind;
  name: string;
  type: string;
  size: number;
}

export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_BYTES = 12 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md"];
export const DOCUMENT_ACCEPT = ACCEPTED_DOCUMENT_EXTENSIONS.join(",");
export const IMAGE_ACCEPT = "image/*";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function validateUploadFile(
  file: File,
  kind: UploadedAttachmentKind,
): string | null {
  if (kind === "image") {
    if (!file.type.startsWith("image/")) return "Please choose an image file.";
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      return `Image must be ${formatFileSize(MAX_IMAGE_UPLOAD_BYTES)} or smaller.`;
    }
    return null;
  }

  const ext = extensionOf(file.name);
  if (!ACCEPTED_DOCUMENT_EXTENSIONS.includes(ext)) {
    return `Document must be one of: ${ACCEPTED_DOCUMENT_EXTENSIONS.join(", ")}.`;
  }
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return `Document must be ${formatFileSize(MAX_DOCUMENT_UPLOAD_BYTES)} or smaller.`;
  }
  return null;
}

