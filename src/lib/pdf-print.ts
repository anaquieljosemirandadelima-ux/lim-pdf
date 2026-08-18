export type PrintPaper = "A4" | "A3" | "Carta";
export type PrintMode = "standard" | "booklet" | "nup";
export type DuplexEdge = "short" | "long";

export type PrintPaperSize = { width: number; height: number; label: string };

export const PRINT_PAPERS: Record<PrintPaper, PrintPaperSize> = {
  A4: { width: 595.28, height: 841.89, label: "A4" },
  A3: { width: 841.89, height: 1190.55, label: "A3" },
  Carta: { width: 612, height: 792, label: "Carta" },
};

export type PrintSheet = {
  sheetNumber: number;
  side: "frente" | "verso";
  pages: (number | null)[];
};

export function bookletOrder(totalPages: number) {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error("O PDF precisa ter pelo menos uma página.");
  const paddedTotal = Math.ceil(totalPages / 4) * 4;
  const pages: (number | null)[] = [];
  for (let start = 0, end = paddedTotal - 1; start < end; start += 2, end -= 2) {
    pages.push(end < totalPages ? end : null, start < totalPages ? start : null);
    pages.push(start + 1 < totalPages ? start + 1 : null, end - 1 < totalPages ? end - 1 : null);
  }
  return { paddedTotal, blankPages: paddedTotal - totalPages, pages };
}

export function bookletSheets(totalPages: number): PrintSheet[] {
  const { pages } = bookletOrder(totalPages);
  const sheets: PrintSheet[] = [];
  for (let index = 0; index < pages.length; index += 4) {
    const sheetNumber = index / 4 + 1;
    sheets.push({ sheetNumber, side: "frente", pages: pages.slice(index, index + 2) });
    sheets.push({ sheetNumber, side: "verso", pages: pages.slice(index + 2, index + 4) });
  }
  return sheets;
}

export function nUpGrid(pagesPerSheet: number) {
  const supported = [2, 4, 6, 9, 16];
  if (!supported.includes(pagesPerSheet)) throw new Error("Escolha 2, 4, 6, 9 ou 16 páginas por folha.");
  if (pagesPerSheet === 2) return { columns: 1, rows: 2 };
  if (pagesPerSheet === 6) return { columns: 2, rows: 3 };
  if (pagesPerSheet === 9) return { columns: 3, rows: 3 };
  if (pagesPerSheet === 16) return { columns: 4, rows: 4 };
  return { columns: 2, rows: 2 };
}

export function nUpSheets(totalPages: number, pagesPerSheet: number): PrintSheet[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error("O PDF precisa ter pelo menos uma página.");
  nUpGrid(pagesPerSheet);
  const sheets: PrintSheet[] = [];
  for (let start = 0, sheetNumber = 1; start < totalPages; start += pagesPerSheet, sheetNumber += 1) {
    sheets.push({ sheetNumber, side: "frente", pages: Array.from({ length: pagesPerSheet }, (_, offset) => start + offset < totalPages ? start + offset : null) });
  }
  return sheets;
}

export function standardSheets(totalPages: number): PrintSheet[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error("O PDF precisa ter pelo menos uma página.");
  return Array.from({ length: totalPages }, (_, index) => ({ sheetNumber: index + 1, side: "frente" as const, pages: [index] }));
}

export function buildPrintPlan(totalPages: number, mode: PrintMode, pagesPerSheet = 2): PrintSheet[] {
  if (mode === "booklet") return bookletSheets(totalPages);
  if (mode === "nup") return nUpSheets(totalPages, pagesPerSheet);
  return standardSheets(totalPages);
}

export function pageLabel(page: number | null) {
  return page === null ? "Em branco" : `Página ${page + 1}`;
}
