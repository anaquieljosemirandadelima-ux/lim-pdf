export const MAX_LOCAL_PDF_BYTES = 60 * 1024 * 1024;

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isFileWithinLimit(file: File, maxBytes = MAX_LOCAL_PDF_BYTES) {
  return file.size <= maxBytes;
}

export function acceptedFileKind(file: File, kind: "pdf" | "docx" | "xlsx") {
  const patterns = {
    pdf: /\.pdf$/i,
    docx: /\.docx$/i,
    xlsx: /\.xlsx$/i,
  } as const;
  const mimeTypes = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } as const;
  return file.type === mimeTypes[kind] || patterns[kind].test(file.name);
}
