import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { PDFDocument } from "pdf-lib";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const fixtureDir = process.env.LIMPDF_QA_DIR || "/tmp/limpdf-qa";
const downloadDir = process.env.LIMPDF_DOWNLOAD_DIR || "/tmp/limpdf-p0-downloads";

function fixture(name: string) {
  return join(fixtureDir, name);
}

async function navigate(page: Page, path: string) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert.equal(response?.status(), 200, `${path}: HTTP ${response?.status()}`);
  await page.locator("#conteudo").waitFor({ state: "visible", timeout: 30_000 });
}

async function assertPdf(path: string, label: string) {
  const bytes = new Uint8Array(await readFile(path));
  assert.ok(bytes.length > 30, `${label}: saída vazia`);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-", `${label}: saída não é PDF`);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  assert.ok(pdf.getPageCount() >= 1, `${label}: PDF sem páginas`);
  return pdf.getPageCount();
}

async function runBookletTool(page: Page) {
  await navigate(page, "/ferramentas/criar-livreto-pdf");
  assert.match(await page.title(), /Livreto e páginas por folha/i);
  assert.equal(await page.getByText("Processamento local", { exact: false }).count() > 0, true, "A ferramenta de livreto deve informar processamento local");
  await page.waitForTimeout(1_000);

  const input = page.locator(".print-center-workspace input[type=file]");
  await input.setInputFiles(fixture("basic.pdf"));
  try {
    await page.locator(".print-center-options").waitFor({ state: "visible", timeout: 60_000 });
  } catch (error) {
    const visible = await page.locator(".print-center-workspace").innerText().catch(() => "");
    const fileState = await input.evaluate((element) => { const files = (element as HTMLInputElement).files; return files ? { count: files.length, name: files[0]?.name || "", type: files[0]?.type || "" } : null; }).catch(() => null);
    await page.screenshot({ path: join(downloadDir, "print-center-upload-failure.png"), fullPage: true }).catch(() => undefined);
    throw new Error(`A ferramenta de livreto não liberou as configurações após upload. Input: ${JSON.stringify(fileState)}. Estado: ${visible.slice(0, 1200)}`, { cause: error });
  }
  await page.locator(".print-center-preview").waitFor({ state: "visible", timeout: 30_000 });

  const selects = page.locator(".print-center-options select");
  assert.equal(await selects.count(), 2, "A ferramenta de livreto deve começar com finalidade e papel; a margem é numérica");
  assert.match(await page.locator(".print-center-preview").innerText(), /ordem de saída/i);

  await selects.nth(0).selectOption("booklet");
  assert.match(await page.locator(".print-center-options").innerText(), /Borda curta/i);
  assert.match(await page.locator(".print-center-preview").innerText(), /frente e verso/i);

  await selects.nth(0).selectOption("nup");
  await page.locator(".print-center-options label span").filter({ hasText: "Páginas por folha" }).waitFor({ state: "visible" });
  assert.equal(await page.locator(".print-center-options select").count(), 3, "Modo N-up deve expor o seletor de páginas por folha");
  await page.locator(".print-center-options select").nth(2).selectOption("4");
  assert.match(await page.locator(".print-center-preview").innerText(), /ordem de saída/i);

  let automaticDownload = false;
  const onAutomaticDownload = () => { automaticDownload = true; };
  page.on("download", onAutomaticDownload);
  await page.getByRole("button", { name: /Gerar saída/i }).click();
  const outputActions = page.locator(".output-actions");
  await outputActions.waitFor({ state: "visible", timeout: 90_000 });
  try {
    await page.getByText("PDF pronto. Escolha imprimir no computador ou baixar o arquivo.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    const workspace = await page.locator(".print-center-workspace").innerText().catch(() => "");
    throw new Error(`A saída da ferramenta de livreto apareceu, mas a mensagem final não foi encontrada. Estado: ${workspace.slice(-1800)}`, { cause: error });
  }
  assert.equal(automaticDownload, false, "A geração não deve iniciar download automaticamente antes da escolha do usuário.");
  assert.equal(await outputActions.getByRole("button", { name: /Imprimir no computador/i }).count(), 1, "O resultado deve oferecer impressão no próprio fluxo.");
  page.off("download", onAutomaticDownload);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    outputActions.getByRole("button", { name: /Baixar resultado/i }).click(),
  ]);
  const output = join(downloadDir, download.suggestedFilename());
  await download.saveAs(output);
  const pages = await assertPdf(output, "Livreto e páginas por folha");
  assert.ok(pages >= 1, "A ferramenta de livreto deve produzir pelo menos uma página");
}

async function runPreflight(page: Page) {
  await navigate(page, "/ferramentas/preflight-pdf");
  assert.match(await page.title(), /Preflight/i);
  await page.waitForTimeout(1_000);
  await page.locator(".preflight-workspace input[type=file]").setInputFiles(fixture("basic.pdf"));
  await page.getByRole("button", { name: /Executar preflight/i }).click();
  await page.locator(".preflight-results").waitFor({ state: "visible", timeout: 90_000 });
  const report = await page.locator(".preflight-results").innerText();
  assert.match(report, /Dimensões consistentes/i);
  assert.match(report, /Texto pesquisável/i);
  assert.match(report, /Sem links externos detectados/i);
  assert.match(await page.locator(".local-job-queue").innerText(), /Concluído/i);

  let automaticDownload = false;
  const onAutomaticDownload = () => { automaticDownload = true; };
  page.on("download", onAutomaticDownload);
  await page.getByRole("button", { name: /Criar cópia sanitizada/i }).click();
  const outputActions = page.locator(".output-actions");
  await outputActions.waitFor({ state: "visible", timeout: 30_000 });
  assert.equal(automaticDownload, false, "A cópia sanitizada não deve iniciar download automaticamente.");
  assert.equal(await outputActions.getByRole("button", { name: /Imprimir no computador/i }).count(), 1, "A cópia sanitizada deve oferecer impressão contextual.");
  page.off("download", onAutomaticDownload);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    outputActions.getByRole("button", { name: /Baixar resultado/i }).click(),
  ]);
  const output = join(downloadDir, download.suggestedFilename());
  await download.saveAs(output);
  assert.match(download.suggestedFilename(), /sanitizado/i);
  await assertPdf(output, "Preflight sanitizado");
  await page.getByText("Cópia sanitizada criada. O PDF original não foi alterado.", { exact: true }).waitFor({ state: "visible" });
}

async function main() {
  await rm(downloadDir, { recursive: true, force: true });
  await mkdir(downloadDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => pageErrors.push(`${page.url()}: ${error.message}`));

  try {
    await runBookletTool(page);
    await runPreflight(page);
    assert.deepEqual(pageErrors, [], `Erros de página: ${pageErrors.join(" | ")}`);
    const relevantConsoleErrors = consoleErrors.filter((line) => !/favicon|adsbygoogle|ERR_BLOCKED_BY_CLIENT|Failed to load resource|data-limpdf-originalaria-label|hydration-mismatch/i.test(line));
    assert.deepEqual(relevantConsoleErrors, [], `Erros de console: ${relevantConsoleErrors.join(" | ")}`);
    console.log(JSON.stringify({ ok: true, suite: "p0-browser", contextualPrint: true, localQueue: true, privacyInspector: true }));
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
