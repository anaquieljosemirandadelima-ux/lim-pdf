import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { PDFDocument } from "pdf-lib";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const outputDir = "/tmp/limpdf-compression-browser";
const projectDir = process.cwd();
const vectorFixture = join(projectDir, "audits/compression-vector-fixture.pdf");
const scannedFixture = join(projectDir, "audits/ocr-fixture-scanned.pdf");

async function processFixture(page: import("playwright-core").Page, fixture: string, preset: string, name: string) {
  await page.goto(`${baseUrl}/ferramentas/compactar-pdf`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("#conteudo").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('input[type="file"]').first().setInputFiles({ name: fixture.split("/").pop() || "fixture.pdf", mimeType: "application/pdf", buffer: await readFile(fixture) });
  await page.locator(".selected-files").waitFor({ state: "visible", timeout: 20_000 });
  const compressionSelect = page.locator(".options-grid select").first();
  await compressionSelect.selectOption(preset);
  const visibleOptions = await compressionSelect.locator("option").allTextContents();
  assert.deepEqual(visibleOptions, ["Alta qualidade", "Recomendada", "Máxima redução"], `${name}: presets desatualizados`);
  await page.locator("button.process-button").click();
  await page.locator(".output-actions").waitFor({ state: "visible", timeout: 120_000 });
  const status = (await page.locator(".status-message").last().textContent()) || "";
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.locator(".output-actions button.secondary-button").click(),
  ]);
  const target = join(outputDir, `${name}-${download.suggestedFilename()}`);
  await download.saveAs(target);
  const output = new Uint8Array(await readFile(target));
  const doc = await PDFDocument.load(output, { ignoreEncryption: true });
  assert.ok(doc.getPageCount() >= 1, `${name}: PDF sem páginas`);
  assert.equal(await page.locator(".status-message.status-error").count(), 0, `${name}: erro visível`);
  return { inputBytes: (await readFile(fixture)).length, outputBytes: output.length, pages: doc.getPageCount(), status };
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  try {
    const results: Record<string, unknown> = {};
    for (const preset of ["alta", "recomendada", "maxima"]) {
      const page = await context.newPage();
      results[`vector-${preset}`] = await processFixture(page, vectorFixture, preset, `vector-${preset}`);
      await page.close();
    }
    const scannedPage = await context.newPage();
    results["scanned-recomendada"] = await processFixture(scannedPage, scannedFixture, "recomendada", "scanned-recomendada");
    await scannedPage.close();
    console.log(JSON.stringify({ ok: true, suite: "compression-browser", results }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
