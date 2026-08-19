export type PdfCompressionPreset = "alta" | "recomendada" | "maxima";

export type PdfCompressionPresetConfig = {
  scale: number;
  quality: number;
  label: string;
  description: string;
};

export const PDF_COMPRESSION_PRESETS: Record<PdfCompressionPreset, PdfCompressionPresetConfig> = {
  alta: {
    scale: 1.6,
    quality: 0.86,
    label: "Alta qualidade",
    description: "Menos redução e mais nitidez; preserva a estrutura quando ela já for menor.",
  },
  recomendada: {
    scale: 1.35,
    quality: 0.72,
    label: "Recomendada",
    description: "Equilíbrio entre tamanho e leitura para a maioria dos PDFs.",
  },
  maxima: {
    scale: 1.05,
    quality: 0.52,
    label: "Máxima redução",
    description: "Arquivo menor para limites rígidos; pode rasterizar páginas.",
  },
};

export type PdfCompressionStrategy = "original" | "estrutural" | "visual";

export type PdfCompressionCandidate = {
  strategy: PdfCompressionStrategy;
  bytes: Uint8Array;
};

export type PdfCompressionSelection = PdfCompressionCandidate & {
  reduction: number;
};

export function getPdfCompressionPreset(value: string): PdfCompressionPreset {
  if (value === "alta" || value === "recomendada" || value === "maxima") return value;
  return "recomendada";
}

export function compressionReduction(inputBytes: number, outputBytes: number) {
  if (!inputBytes || outputBytes >= inputBytes) return 0;
  return Math.round((1 - outputBytes / inputBytes) * 100);
}

export function chooseSmallestPdf(input: Uint8Array, candidates: Array<PdfCompressionCandidate | null | undefined>): PdfCompressionSelection {
  const options: PdfCompressionCandidate[] = [{ strategy: "original", bytes: input }, ...candidates.filter((candidate): candidate is PdfCompressionCandidate => Boolean(candidate))];
  const selected = options.reduce((smallest, candidate) => candidate.bytes.length < smallest.bytes.length ? candidate : smallest, options[0]);
  return { ...selected, reduction: compressionReduction(input.length, selected.bytes.length) };
}
