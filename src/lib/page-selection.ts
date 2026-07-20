export function parsePages(specification: string, pageCount: number, allowEmpty = false) {
  const cleaned = specification.trim();
  if (!cleaned && allowEmpty) return Array.from({ length: pageCount }, (_, index) => index);

  const pages = new Set<number>();
  const fragments = cleaned.split(",").map((fragment) => fragment.trim()).filter(Boolean);
  if (!fragments.length) throw new Error("Informe ao menos uma página, como 1,3-5.");

  for (const fragment of fragments) {
    if (fragment.includes("-")) {
      const parts = fragment.split("-");
      if (parts.length !== 2) throw new Error(`Intervalo inválido: ${fragment}.`);
      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Intervalo inválido: ${fragment}.`);
      }
      for (let page = start; page <= end; page += 1) pages.add(page - 1);
    } else {
      const page = Number(fragment);
      if (!Number.isInteger(page)) throw new Error(`Página inválida: ${fragment}.`);
      pages.add(page - 1);
    }
  }

  const parsed = [...pages].sort((a, b) => a - b);
  if (parsed.some((page) => page < 0 || page >= pageCount)) {
    throw new Error(`O documento possui ${pageCount} página(s). Revise a seleção.`);
  }
  return parsed;
}

export function parsePageOrder(specification: string, pageCount: number) {
  const fragments = specification.split(",").map((fragment) => fragment.trim()).filter(Boolean);
  if (!fragments.length) throw new Error("Informe a nova ordem, como 3,1,2,4.");
  const pages: number[] = [];
  for (const fragment of fragments) {
    if (fragment.includes("-")) {
      const parts = fragment.split("-");
      if (parts.length !== 2) throw new Error(`Intervalo inválido: ${fragment}.`);
      const start = Number(parts[0]);
      const end = Number(parts[1]);
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Intervalo inválido: ${fragment}.`);
      const step = start <= end ? 1 : -1;
      for (let page = start; step > 0 ? page <= end : page >= end; page += step) pages.push(page - 1);
    } else {
      const page = Number(fragment);
      if (!Number.isInteger(page)) throw new Error(`Página inválida: ${fragment}.`);
      pages.push(page - 1);
    }
  }
  if (pages.some((page) => page < 0 || page >= pageCount)) {
    throw new Error(`O documento possui ${pageCount} página(s). Revise a ordem.`);
  }
  return pages;
}
