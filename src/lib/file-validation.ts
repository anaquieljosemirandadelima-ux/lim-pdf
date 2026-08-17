export const MAX_LOCAL_PDF_BYTES = 500 * 1024 * 1024;
export const LARGE_LOCAL_FILE_BYTES = 100 * 1024 * 1024;
export const VERY_LARGE_LOCAL_FILE_BYTES = 250 * 1024 * 1024;

export type FileSizeTier = "standard" | "large" | "very-large";

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isFileWithinLimit(file: File, maxBytes = MAX_LOCAL_PDF_BYTES) {
  return file.size <= maxBytes;
}

export function formatFileSizeLimit(maxBytes = MAX_LOCAL_PDF_BYTES) {
  const megabytes = Math.round(maxBytes / (1024 * 1024));
  return `${megabytes} MB`;
}

export function getFileSizeTier(file: Pick<File, "size">): FileSizeTier {
  if (file.size >= VERY_LARGE_LOCAL_FILE_BYTES) return "very-large";
  if (file.size >= LARGE_LOCAL_FILE_BYTES) return "large";
  return "standard";
}

export function getFileSizeGuidance(file: Pick<File, "size">) {
  const tier = getFileSizeTier(file);
  if (tier === "very-large") {
    return {
      tier,
      message: "Arquivo grande: mantenha esta aba aberta e feche outros aplicativos para reduzir a pressão de memória.",
    } as const;
  }
  if (tier === "large") {
    return {
      tier,
      message: "Arquivo grande: o processamento continua local, mas pode levar mais tempo dependendo do dispositivo.",
    } as const;
  }
  return { tier, message: "" } as const;
}

export function getDeviceMemoryGuidance(file: Pick<File, "size">) {
  if (typeof navigator === "undefined" || file.size < LARGE_LOCAL_FILE_BYTES) return "";
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (!deviceMemory) return "";
  if (deviceMemory <= 4) return "Seu dispositivo reporta pouca memória disponível: processe um arquivo por vez e feche outras abas antes de iniciar.";
  if (deviceMemory <= 8 && file.size >= VERY_LARGE_LOCAL_FILE_BYTES) return "Para este arquivo muito grande, o modo sequencial pode levar mais tempo; evite abrir outras ferramentas durante a operação.";
  return "";
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
