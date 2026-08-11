import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { PDFDocument } from "pdf-lib";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const fixtureDir = process.env.LIMPDF_QA_DIR || "/tmp/limpdf-qa";
const outDir = process.env.LIMPDF_OFFICE_DIR || "/tmp/limpdf-office-fidelity";
const inputPdf = join(fixtureDir, "basic.pdf");

async function openTool(page: Page, slug: string, filePath: string) {
  const response = await page.goto(`${baseUrl}/ferramentas/${slug}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${slug}: HTTP ${response?.status()}`);
  assert.ok(await page.locator(".office-fidelity-workspace").isVisible(), `${slug}: workspace de fidelidade não apareceu`);
  await page.locator('.office-fidelity-workspace input[type="file"]').setInputFiles(filePath);
  await page.locator(".selected-files").waitFor({ state: "visible", timeout: 20_000 });
}

async function download(page: Page, slug: string, timeout = 90_000) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout }),
    page.locator(".office-fidelity-workspace .process-button").click(),
  ]);
  const target = join(outDir, `${slug}-${download.suggestedFilename()}`);
  await download.saveAs(target);
  assert.equal(await page.locator(".status-message.error").count(), 0, `${slug}: erro visível`);
  return target;
}

async function assertZip(path: string) {
  const bytes = new Uint8Array(await readFile(path));
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b);
  assert.ok(bytes.length > 500, `${path}: pacote Office pequeno demais`);
}

async function assertPdf(path: string) {
  const bytes = new Uint8Array(await readFile(path));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  assert.ok(pdf.getPageCount() >= 1, `${path}: PDF sem páginas`);
}

async function main() {
  await rm(outDir, { recursive: true, force: true }); await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  try {
    await openTool(page, "pdf-para-word", inputPdf);
    await page.locator(".office-fidelity-workspace select").selectOption("editable");
    const editableDocx = await download(page, "pdf-para-word-editable"); await assertZip(editableDocx);

    await openTool(page, "pdf-para-word", inputPdf);
    await page.locator(".office-fidelity-workspace select").selectOption("visual");
    const visualDocx = await download(page, "pdf-para-word-visual"); await assertZip(visualDocx);

    await openTool(page, "word-para-pdf", editableDocx);
    const wordPdf = await download(page, "word-para-pdf"); await assertPdf(wordPdf);

    await openTool(page, "pdf-para-excel", inputPdf);
    const xlsx = await download(page, "pdf-para-excel"); await assertZip(xlsx);

    await openTool(page, "excel-para-pdf", xlsx);
    const excelPdf = await download(page, "excel-para-pdf"); await assertPdf(excelPdf);

    assert.deepEqual(errors, [], errors.join(" | "));
    console.log(JSON.stringify({ ok: true, suite: "office-fidelity-browser", pdfToDocxEditable: true, pdfToDocxVisual: true, docxToPdf: true, pdfToXlsx: true, xlsxToPdf: true }));
  } finally { await context.close(); await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
