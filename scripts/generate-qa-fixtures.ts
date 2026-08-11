import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createStoredZip } from "../src/lib/browser-files";

const outDir = process.env.LIMPDF_QA_DIR || "/tmp/limpdf-qa";
const encoder = new TextEncoder();

async function blobBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function makePdf(label: string, pages: number) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(label, { x: 54, y: 760, size: 24, font: bold, color: rgb(.08, .16, .3) });
    page.drawText(`LIM PDF QA página ${index + 1}`, { x: 54, y: 720, size: 14, font, color: rgb(.12, .2, .32) });
    page.drawText("Texto pesquisável para Word Excel destacar e edição.", { x: 54, y: 680, size: 12, font });
    page.drawText(`Código QA-${String(index + 1).padStart(3, "0")}`, { x: 54, y: 646, size: 11, font });
    page.drawRectangle({ x: 54, y: 560, width: 220, height: 48, color: rgb(.93, .96, 1), borderColor: rgb(.3, .45, .78), borderWidth: 1 });
  }
  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

function makeDocx() {
  return createStoredZip([
    { name: "[Content_Types].xml", data: encoder.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
    { name: "word/document.xml", data: encoder.encode('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>LIM PDF documento Word de homologação</w:t></w:r></w:p><w:p><w:r><w:t>Segunda linha editável</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Coluna A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Coluna B</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>') },
    { name: "word/_rels/document.xml.rels", data: encoder.encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>') },
  ]);
}

function makeXlsx() {
  return createStoredZip([
    { name: "[Content_Types].xml", data: encoder.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>') },
    { name: "_rels/.rels", data: encoder.encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { name: "xl/workbook.xml", data: encoder.encode('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>') },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>') },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode('<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Produto</t></is></c><c r="B1" t="inlineStr"><is><t>Valor</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>LIM PDF QA</t></is></c><c r="B2"><v>42</v></c></row></sheetData></worksheet>') },
  ]);
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const basic = await makePdf("Documento básico", 3);
  const onePage = await makePdf("Documento de uma página", 1);
  const manyPages = await makePdf("Documento multipágina", 16);
  await writeFile(join(outDir, "basic.pdf"), basic);
  await writeFile(join(outDir, "one-page.pdf"), onePage);
  await writeFile(join(outDir, "many-pages.pdf"), manyPages);

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8R8AAAAASUVORK5CYII=", "base64");
  await writeFile(join(outDir, "sample.png"), png);

  const imageOnly = await PDFDocument.create();
  const image = await imageOnly.embedPng(png);
  const imagePage = imageOnly.addPage([595.28, 841.89]);
  imagePage.drawImage(image, { x: 0, y: 0, width: imagePage.getWidth(), height: imagePage.getHeight() });
  await writeFile(join(outDir, "image-only.pdf"), await imageOnly.save());

  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([595.28, 841.89]);
  const form = formDoc.getForm();
  const text = form.createTextField("cliente");
  text.setText("LIM PDF QA");
  text.addToPage(formPage, { x: 70, y: 700, width: 260, height: 34 });
  const check = form.createCheckBox("aprovado");
  check.addToPage(formPage, { x: 70, y: 640, width: 24, height: 24 });
  check.check();
  await writeFile(join(outDir, "form.pdf"), await formDoc.save());

  await writeFile(join(outDir, "sample.docx"), await blobBytes(makeDocx()));
  await writeFile(join(outDir, "sample.xlsx"), await blobBytes(makeXlsx()));
  await writeFile(join(outDir, "corrupt.pdf"), encoder.encode("%PDF-1.7\nobjeto-corrompido-sem-xref"));

  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
  const { decryptPDF } = await import("@pdfsmaller/pdf-decrypt");
  const protectedBytes = await encryptPDF(basic, "qa1234", {
    ownerPassword: "owner1234",
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });
  await writeFile(join(outDir, "protected.pdf"), protectedBytes);
  const decrypted = await decryptPDF(protectedBytes, "qa1234");
  const reopened = await PDFDocument.load(decrypted);
  assert.equal(reopened.getPageCount(), 3);

  console.log(JSON.stringify({
    ok: true,
    outDir,
    fixtures: ["basic.pdf", "one-page.pdf", "many-pages.pdf", "image-only.pdf", "form.pdf", "protected.pdf", "corrupt.pdf", "sample.png", "sample.docx", "sample.xlsx"],
  }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
