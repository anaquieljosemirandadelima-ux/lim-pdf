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
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));

  try {
    const response = await page.goto(`${baseUrl}/ferramentas/ocr-pdf`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    assert.equal(response?.status(), 200);
    await page.locator(".ocr-workspace").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator('.ocr-workspace .drop-zone input[type="file"]').setInputFiles(join(fixtureDir, "one-page.pdf"));
    await page.locator(".selected-files").waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(".ocr-options select").nth(0).selectOption("eng");

    const outputActions = page.locator(".output-actions");
    const errorPromise = page.locator(".status-message.error").waitFor({ state: "visible", timeout: 75_000 }).then(async () => ({ kind: "error" as const, message: (await page.locator(".status-message.error").textContent()) || "OCR exibiu erro" }));
    await page.locator(".prominent-process").click();
    try {
      const outcome = await Promise.race([outputActions.waitFor({ state: "visible", timeout: 75_000 }).then(() => ({ kind: "output" as const })), errorPromise]);
      if (outcome.kind === "error") throw new Error(`OCR exibiu erro: ${outcome.message}; pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)}`);
    } catch (error) {
      const progress = await page.locator(".ocr-progress").textContent().catch(() => "");
      const button = await page.locator(".prominent-process").textContent().catch(() => "");
      throw new Error(`OCR não concluiu no prazo. Botão=${JSON.stringify(button)} progresso=${JSON.stringify(progress)} pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)}`, { cause: error });
    }
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      outputActions.getByRole("button", { name: /Baixar resultado/i }).click(),
    ]);
    const path = join(outDir, download.suggestedFilename());
    await download.saveAs(path);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors.filter((text) => !/favicon|adsbygoogle|ERR_BLOCKED_BY_CLIENT/i.test(text)), []);

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
    const batchErrorPromise = page.locator(".status-message.error").waitFor({ state: "visible", timeout: 75_000 }).then(async () => ({ kind: "error" as const, message: (await page.locator(".status-message.error").textContent()) || "OCR em lote exibiu erro" }));
    await page.locator('.ocr-workspace .drop-zone input[type="file"]').setInputFiles([join(fixtureDir, "one-page.pdf"), join(fixtureDir, "one-page.pdf")]);
    await page.locator(".selected-file-row").nth(1).waitFor({ state: "visible", timeout: 20_000 });
    await page.locator(".prominent-process").click();
    try {
      const batchOutcome = await Promise.race([outputActions.waitFor({ state: "visible", timeout: 75_000 }).then(() => ({ kind: "output" as const })), batchErrorPromise]);
      if (batchOutcome.kind === "error") throw new Error(`OCR em lote exibiu erro: ${batchOutcome.message}`);
    } catch (error) {
      throw new Error(`OCR em lote não concluiu no prazo; pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)}`, { cause: error });
    }
    const [batchDownload] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      outputActions.getByRole("button", { name: /Baixar resultado/i }).click(),
    ]);
    const batchPath = join(outDir, batchDownload.suggestedFilename());
    await batchDownload.saveAs(batchPath);
    const batchBytes = new Uint8Array(await readFile(batchPath));
    assert.equal(batchBytes[0], 0x50, "OCR em lote deveria gerar ZIP");
    assert.equal(batchBytes[1], 0x4b, "OCR em lote deveria gerar ZIP");
    assert.ok(new TextDecoder().decode(batchBytes).includes("-ocr.pdf"), "ZIP do OCR deveria conter PDFs pesquisáveis");
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors.filter((text) => !/favicon|adsbygoogle|ERR_BLOCKED_BY_CLIENT/i.test(text)), []);

    console.log(JSON.stringify({ ok: true, suite: "ocr-searchable-browser", pages: pageCount, extractedCharacters: normalized.length, searchableLayer: true, batchZip: true }));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
