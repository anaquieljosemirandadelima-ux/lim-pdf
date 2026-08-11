import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const fixtureDir = process.env.LIMPDF_QA_DIR || "/tmp/limpdf-qa";
const outDir = "/tmp/limpdf-ocr-qa";

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 }, acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(`${baseUrl}/ferramentas/ocr-pdf`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200);
    await page.locator('.ocr-workspace .drop-zone input[type="file"]').setInputFiles(join(fixtureDir, "one-page.pdf"));
    await page.locator(".selected-files").waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(".ocr-options select").selectOption("eng");

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 180_000 }),
      page.locator(".prominent-process").click(),
    ]);
    const path = join(outDir, download.suggestedFilename());
    await download.saveAs(path);
    assert.equal(await page.locator(".status-message.error").count(), 0);
    assert.deepEqual(pageErrors, []);

    const bytes = new Uint8Array(await readFile(path));
    assert.ok(bytes.length > 100, "OCR gerou arquivo vazio");
    const document = await getDocument({ data: bytes, disableWorker: true }).promise;
    let text = "";
    const pageCount = document.numPages;
    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const pdfPage = await document.getPage(pageNumber);
        const content = await pdfPage.getTextContent();
        text += " " + content.items.map((item) => "str" in item ? item.str : "").join(" ");
        pdfPage.cleanup();
      }
    } finally {
      await document.cleanup();
    }
    const normalized = text.replace(/\s+/g, " ").trim();
    assert.ok(normalized.length >= 3, `OCR deveria gerar camada pesquisável; texto extraído: ${JSON.stringify(normalized)}`);
    console.log(JSON.stringify({ ok: true, suite: "ocr-searchable-browser", pages: pageCount, extractedCharacters: normalized.length, searchableLayer: true }));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
