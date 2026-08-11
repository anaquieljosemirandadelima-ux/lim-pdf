import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFArray, PDFDict, PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { addBates, addBookmarks, addHyperlink, addInternalPageLink, addNativeAnnotation, createFormPdf, editMetadata, preparePdfA, processBatch, signPdfPades } from "../src/lib/pro-pdf-engines";

async function samplePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < 3; index += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`LIM PDF PRO QA PAGE ${index + 1}`, { x: 72, y: 760, size: 18, font });
  }
  return new File([await pdf.save()], "pro-qa.pdf", { type: "application/pdf" });
}

async function assertLoadable(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  assert.equal(pdf.getPageCount(), 3);
  return pdf;
}

async function main() {
  const input = await samplePdf();
  const external = await addHyperlink(input, { url: "https://limpdf.com.br", page: 1, x: 72, y: 700, width: 180, height: 24 });
  const externalPdf = await assertLoadable(external.bytes);
  assert.ok(externalPdf.getPages()[0].node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.size(), "Hyperlink externo deve criar annotation.");
  await assertLoadable((await addInternalPageLink(input, { sourcePage: 1, targetPage: 3, x: 72, y: 650, width: 180, height: 24 })).bytes);
  await assertLoadable((await addNativeAnnotation(input, { type: "highlight", page: 1, x: 72, y: 600, width: 220, height: 20, text: "QA highlight" })).bytes);

  const formResult = await createFormPdf(input, [
    { type: "text", name: "nome", page: 1, x: 72, y: 550, width: 220, height: 28 },
    { type: "date", name: "data", page: 1, x: 72, y: 510, width: 120, height: 28 },
    { type: "checkbox", name: "aceite", page: 1, x: 72, y: 470, width: 20, height: 20 },
    { type: "radio", name: "escolha", page: 2, x: 72, y: 500, width: 18, height: 18, options: ["Sim", "Não"] },
    { type: "dropdown", name: "lista", page: 2, x: 72, y: 450, width: 140, height: 28, options: ["A", "B"] },
  ]);
  const formPdf = await assertLoadable(formResult.bytes);
  assert.ok(formPdf.getForm().getFields().length >= 5, "AcroForm deve manter campos reais.");

  const bookmarkPdf = await assertLoadable((await addBookmarks(input, [{ title: "Início", page: 1 }, { title: "Final", page: 3 }])).bytes);
  assert.ok(bookmarkPdf.catalog.lookupMaybe(PDFName.of("Outlines"), PDFDict), "Outline deve existir no catálogo.");
  await assertLoadable((await addBates(input, { prefix: "QA-", start: 500, digits: 6, position: "bottom-right" })).bytes);

  const metadataPdf = await assertLoadable((await editMetadata(input, { title: "LIM PDF QA", author: "LIM PDF", subject: "PRO", keywords: "pdf,qa" })).bytes);
  assert.equal(metadataPdf.getTitle(), "LIM PDF QA");
  assert.equal(metadataPdf.getAuthor(), "LIM PDF");

  const pdfaResult = await preparePdfA(input);
  const pdfaPdf = await assertLoadable(pdfaResult.bytes);
  assert.ok(pdfaPdf.catalog.get(PDFName.of("Metadata")), "Preparação PDF/A precisa inserir XMP Metadata.");
  assert.ok(pdfaResult.report.some((item) => item.includes("ICC")), "Relatório deve manter ressalva de conformidade estrita.");

  const batch = await processBatch([input, input], "metadata");
  assert.ok(batch.blob.size > 100);
  assert.equal(batch.count, 2);

  const temp = mkdtempSync(join(tmpdir(), "limpdf-sign-"));
  try {
    const keyPath = join(temp, "key.pem"); const certPath = join(temp, "cert.pem"); const pkcs8Path = join(temp, "pkcs8.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", keyPath, "-out", certPath, "-sha256", "-days", "1", "-nodes", "-subj", "/CN=LIM PDF QA"], { stdio: "ignore" });
    execFileSync("openssl", ["pkcs8", "-topk8", "-inform", "PEM", "-outform", "PEM", "-nocrypt", "-in", keyPath, "-out", pkcs8Path], { stdio: "ignore" });
    const signed = await signPdfPades(input, readFileSync(certPath, "utf8"), readFileSync(pkcs8Path, "utf8"), { name: "LIM PDF QA", reason: "Teste automatizado", visible: true });
    assert.ok(new TextDecoder("latin1").decode(signed.bytes).includes("/ETSI.CAdES.detached"));
    await assertLoadable(signed.bytes);
  } finally { rmSync(temp, { recursive: true, force: true }); }

  console.log(JSON.stringify({ ok: true, suite: "pro-pdf-engines", hyperlinks: true, internalLinks: true, annotations: true, acroform: true, bookmarks: true, bates: true, metadata: true, pdfaPreparation: true, batch: true, pades: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
