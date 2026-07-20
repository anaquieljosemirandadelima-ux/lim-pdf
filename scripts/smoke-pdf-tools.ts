import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { createStoredZip } from "../src/lib/browser-files";

async function main() {

  const outDir = "/tmp/limpdf-smoke";
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  async function sample(label: string, pages = 3) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let index = 0; index < pages; index += 1) {
      const page = doc.addPage([400, 550]);
      page.drawText(`${label} - página ${index + 1}`, { x: 40, y: 480, size: 22, font, color: rgb(0.1, 0.2, 0.4) });
    }
    return doc;
  }

  const first = await sample("Primeiro", 3);
  const second = await sample("Segundo", 2);
  const firstBytes = await first.save();
  const secondBytes = await second.save();
  await writeFile(`${outDir}/first.pdf`, firstBytes);
  await writeFile(`${outDir}/second.pdf`, secondBytes);

  const merged = await PDFDocument.create();
  for (const source of [first, second]) (await merged.copyPages(source, source.getPageIndices())).forEach((page) => merged.addPage(page));
  assert.equal(merged.getPageCount(), 5);
  await writeFile(`${outDir}/merged.pdf`, await merged.save({ useObjectStreams: true }));

  const extracted = await PDFDocument.create();
  (await extracted.copyPages(first, [2, 0, 0])).forEach((page) => extracted.addPage(page));
  assert.equal(extracted.getPageCount(), 3);
  await writeFile(`${outDir}/reordered.pdf`, await extracted.save());

  const edited = await PDFDocument.load(firstBytes);
  edited.getPage(0).setRotation(degrees(90));
  edited.insertPage(1, [595.28, 841.89]);
  edited.getPage(0).setCropBox(10, 10, 380, 530);
  edited.setTitle("");
  edited.setAuthor("");
  await writeFile(`${outDir}/edited.pdf`, await edited.save());

  const base = await PDFDocument.load(firstBytes);
  const layer = await PDFDocument.load(secondBytes);
  const embeddedLayer = await base.embedPage(layer.getPage(0));
  base.getPage(0).drawPage(embeddedLayer, { x: 0, y: 0, width: 400, height: 550, opacity: 0.25 });
  await writeFile(`${outDir}/overlay.pdf`, await base.save());

  const decorated = await PDFDocument.load(firstBytes);
  const font = await decorated.embedFont(StandardFonts.HelveticaBold);
  decorated.getPage(0).drawText("LIM PDF", { x: 130, y: 260, size: 36, font, rotate: degrees(35), opacity: 0.2 });
  await writeFile(`${outDir}/decorated.pdf`, await decorated.save());

  const mirrored = await PDFDocument.create();
  for (const sourcePage of (await PDFDocument.load(firstBytes)).getPages()) {
    const embedded = await mirrored.embedPage(sourcePage);
    const page = mirrored.addPage([sourcePage.getWidth(), sourcePage.getHeight()]);
    page.drawPage(embedded, { x: sourcePage.getWidth(), y: 0, xScale: -1, yScale: 1 });
  }
  assert.equal(mirrored.getPageCount(), 3);
  await writeFile(`${outDir}/mirrored.pdf`, await mirrored.save());

  const background = await PDFDocument.create();
  for (const sourcePage of (await PDFDocument.load(firstBytes)).getPages()) {
    const embedded = await background.embedPage(sourcePage);
    const page = background.addPage([sourcePage.getWidth(), sourcePage.getHeight()]);
    page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: rgb(0.95, 0.97, 1) });
    page.drawPage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  await writeFile(`${outDir}/background.pdf`, await background.save());

  const formDoc = await PDFDocument.create();
  const formPage = formDoc.addPage([400, 300]);
  const form = formDoc.getForm();
  const text = form.createTextField("nome");
  text.addToPage(formPage, { x: 40, y: 200, width: 250, height: 32 });
  text.setText("LIM PDF");
  const checkbox = form.createCheckBox("aceite");
  checkbox.addToPage(formPage, { x: 40, y: 140, width: 20, height: 20 });
  checkbox.check();
  form.flatten({ updateFieldAppearances: true });
  assert.equal(form.getFields().length, 0);
  await writeFile(`${outDir}/form-flattened.pdf`, await formDoc.save());

  const zipEntries = [];
  const splitSource = await PDFDocument.load(firstBytes);
  for (const index of splitSource.getPageIndices()) {
    const pageDoc = await PDFDocument.create();
    const [page] = await pageDoc.copyPages(splitSource, [index]);
    pageDoc.addPage(page);
    zipEntries.push({ name: `pagina-${index + 1}.pdf`, data: await pageDoc.save() });
  }
  const zip = createStoredZip(zipEntries);
  await writeFile(`${outDir}/pages.zip`, Buffer.from(await zip.arrayBuffer()));
  const zipBytes = await readFile(`${outDir}/pages.zip`);
  assert.equal(zipBytes.readUInt32LE(0), 0x04034b50);
  assert.equal(zipBytes.readUInt32LE(zipBytes.length - 22), 0x06054b50);
  assert.equal(zipBytes.readUInt16LE(zipBytes.length - 14), zipEntries.length);

  console.log(JSON.stringify({ ok: true, suite: "pdf-tools", files: 10, mergedPages: merged.getPageCount(), splitPages: zipEntries.length }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
