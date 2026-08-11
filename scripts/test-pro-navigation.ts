import assert from "node:assert/strict";
import { PDFArray, PDFDict, PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { addBookmarks, addHyperlink, createFormPdf, removeAllHyperlinks } from "../src/lib/pro-pdf-engines";

async function fixture() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`LIM PDF NAV ${i + 1}`, { x: 72, y: 760, size: 16, font });
  }
  return new File([await pdf.save()], "navigation.pdf", { type: "application/pdf" });
}

async function main() {
  const input = await fixture();
  const linked = await addHyperlink(input, { url: "https://limpdf.com.br", page: 1, x: 72, y: 700, width: 180, height: 24 });
  const linkedPdf = await PDFDocument.load(linked.bytes);
  assert.ok(linkedPdf.getPages()[0].node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.size(), "Link annotation ausente");

  const cleaned = await removeAllHyperlinks(new File([linked.bytes], "linked.pdf", { type: "application/pdf" }));
  assert.equal(cleaned.removed, 1, "Um link deveria ter sido removido");

  const outlined = await addBookmarks(input, [
    { title: "Principal", page: 1, level: 0 },
    { title: "Subseção", page: 2, level: 1 },
    { title: "Final", page: 3, level: 0 },
  ]);
  const outlinedPdf = await PDFDocument.load(outlined.bytes);
  assert.ok(outlinedPdf.catalog.lookupMaybe(PDFName.of("Outlines"), PDFDict), "Outlines ausente");

  const form = await createFormPdf(input, [
    { type: "text", name: "nome", page: 1, x: 72, y: 620, width: 220, height: 28 },
    { type: "signature", name: "assinatura_digital", page: 1, x: 72, y: 540, width: 240, height: 56 },
  ]);
  const raw = new TextDecoder("latin1").decode(form.bytes);
  assert.ok(raw.includes("/FT /Sig"), "Campo de assinatura deve ser /FT /Sig");
  const formPdf = await PDFDocument.load(form.bytes);
  assert.ok(formPdf.getForm().getFields().length >= 2, "AcroForm deve expor texto e assinatura");

  console.log(JSON.stringify({ ok: true, suite: "pro-navigation", removeLinks: true, hierarchicalBookmarks: true, signatureField: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
