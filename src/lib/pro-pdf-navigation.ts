import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { safeBaseName, type BookmarkDraft } from "@/lib/pro-pdf-core";

export async function removeAllHyperlinks(file: File) {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  let removed = 0;
  for (const page of pdf.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    const kept = PDFArray.withContext(pdf.context);
    for (let index = 0; index < annots.size(); index += 1) {
      const entry = annots.get(index);
      const dict = pdf.context.lookupMaybe(entry, PDFDict);
      const subtype = dict?.get(PDFName.of("Subtype"));
      if (subtype?.toString() === "/Link") { removed += 1; continue; }
      kept.push(entry);
    }
    if (kept.size()) page.node.set(PDFName.of("Annots"), kept);
    else page.node.delete(PDFName.of("Annots"));
  }
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-sem-links.pdf`, removed };
}

export async function addBookmarksAdvanced(file: File, bookmarks: BookmarkDraft[]) {
  if (!bookmarks.length) throw new Error("Adicione pelo menos um marcador.");
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const pages = pdf.getPages();
  const ctx = pdf.context;
  const root = PDFDict.withContext(ctx);
  root.set(PDFName.of("Type"), PDFName.of("Outlines"));
  const rootRef = ctx.register(root);

  type Item = { draft: BookmarkDraft; dict: PDFDict; ref: ReturnType<typeof ctx.register>; parentIndex: number | null };
  const items: Item[] = [];
  const stack: number[] = [];

  for (const draft of bookmarks) {
    const page = pages[draft.page - 1];
    if (!page) throw new Error(`Página ${draft.page} não existe.`);
    const level = Math.max(0, Math.min(3, Math.floor(draft.level || 0)));
    while (stack.length > level) stack.pop();
    const parentIndex = level > 0 && stack[level - 1] !== undefined ? stack[level - 1] : null;
    const dict = PDFDict.withContext(ctx);
    dict.set(PDFName.of("Title"), PDFHexString.fromText(draft.title));
    dict.set(PDFName.of("Dest"), ctx.obj([page.ref, PDFName.of("Fit")]) as PDFArray);
    const ref = ctx.register(dict);
    const index = items.length;
    items.push({ draft: { ...draft, level }, dict, ref, parentIndex });
    stack[level] = index;
    stack.length = level + 1;
  }

  const childMap = new Map<number | null, number[]>();
  items.forEach((item, index) => {
    const key = item.parentIndex;
    const children = childMap.get(key) || [];
    children.push(index);
    childMap.set(key, children);
  });

  for (const [parentIndex, children] of childMap) {
    children.forEach((itemIndex, position) => {
      const item = items[itemIndex];
      item.dict.set(PDFName.of("Parent"), parentIndex === null ? rootRef : items[parentIndex].ref);
      if (position > 0) item.dict.set(PDFName.of("Prev"), items[children[position - 1]].ref);
      if (position < children.length - 1) item.dict.set(PDFName.of("Next"), items[children[position + 1]].ref);
    });
    if (parentIndex !== null && children.length) {
      const parent = items[parentIndex].dict;
      parent.set(PDFName.of("First"), items[children[0]].ref);
      parent.set(PDFName.of("Last"), items[children.at(-1)!].ref);
      parent.set(PDFName.of("Count"), ctx.obj(children.length));
    }
  }

  const roots = childMap.get(null) || [];
  if (!roots.length) throw new Error("Nenhum marcador raiz válido.");
  root.set(PDFName.of("First"), items[roots[0]].ref);
  root.set(PDFName.of("Last"), items[roots.at(-1)!].ref);
  root.set(PDFName.of("Count"), ctx.obj(items.length));
  pdf.catalog.set(PDFName.of("Outlines"), rootRef);
  pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  return { bytes: await pdf.save(), filename: `${safeBaseName(file)}-marcadores.pdf` };
}
