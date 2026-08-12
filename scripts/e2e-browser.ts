import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { PDFDocument } from "pdf-lib";
import { allTools, type AllToolSlug } from "../src/lib/all-tools";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const fixtureDir = process.env.LIMPDF_QA_DIR || "/tmp/limpdf-qa";
const downloadDir = process.env.LIMPDF_DOWNLOAD_DIR || "/tmp/limpdf-qa-downloads";

const multiPdf = new Set<AllToolSlug>(["juntar-pdf", "alternar-pdfs", "sobrepor-pdfs"]);
const formTools = new Set<AllToolSlug>(["preencher-formulario-pdf", "achatar-formulario-pdf"]);
const zipOutputs = new Set<AllToolSlug>(["dividir-pdf", "pdf-para-jpg", "pdf-para-png", "extrair-texto-pdf", "pdf-para-word", "pdf-para-excel"]);
const encryptedOutputs = new Set<AllToolSlug>(["proteger-pdf", "permissoes-pdf"]);

function fixture(name: string) { return join(fixtureDir, name); }

async function validateOutput(slug: AllToolSlug, path: string) {
  const bytes = new Uint8Array(await readFile(path));
  assert.ok(bytes.length > 30, `${slug}: saída vazia`);
  if (zipOutputs.has(slug)) {
    assert.equal(bytes[0], 0x50, `${slug}: ZIP inválido`);
    assert.equal(bytes[1], 0x4b, `${slug}: ZIP inválido`);
    return;
  }
  const header = new TextDecoder().decode(bytes.slice(0, 8));
  assert.ok(header.startsWith("%PDF-"), `${slug}: saída não é PDF`);
  if (encryptedOutputs.has(slug)) {
    assert.ok(new TextDecoder("latin1").decode(bytes).includes("/Encrypt"), `${slug}: PDF deveria estar criptografado`);
    return;
  }
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  assert.ok(doc.getPageCount() >= 1, `${slug}: PDF sem páginas`);
}

async function primaryFixture(slug: AllToolSlug) {
  if (slug === "word-para-pdf") return fixture("sample.docx");
  if (slug === "excel-para-pdf") return fixture("sample.xlsx");
  if (slug === "imagens-para-pdf") return fixture("sample.png");
  if (slug === "desbloquear-pdf") return fixture("protected.pdf");
  if (formTools.has(slug)) return fixture("form.pdf");
  return fixture("basic.pdf");
}

async function drawSignature(page: Page) {
  const canvas = page.locator(".signature-canvas").first();
  await canvas.waitFor({ state: "visible" });
  const box = await canvas.boundingBox();
  assert.ok(box, "Canvas de assinatura sem área visível");
  await page.mouse.move(box.x + 20, box.y + box.height * .62);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .33, box.y + box.height * .35, { steps: 6 });
  await page.mouse.move(box.x + box.width * .56, box.y + box.height * .68, { steps: 6 });
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .38, { steps: 6 });
  await page.mouse.up();
}

async function prepareTool(page: Page, slug: AllToolSlug) {
  if (slug === "adicionar-imagem-pdf") {
    const inputs = page.locator('input[type="file"]');
    await inputs.nth(1).setInputFiles(fixture("sample.png"));
  }
  if (slug === "assinar-pdf") await drawSignature(page);
  if (slug === "destacar-texto") await page.locator('input[placeholder*="prazo"]').fill("LIM PDF");
  if (slug === "proteger-pdf") {
    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill("qa1234");
    await passwords.nth(1).fill("qa1234");
    await passwords.nth(2).fill("owner1234");
  }
  if (slug === "desbloquear-pdf") await page.locator('input[type="password"]').first().fill("qa1234");
  if (slug === "permissoes-pdf") await page.locator('input[type="password"]').first().fill("owner1234");
}

async function navigate(page: Page, path: string) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert.equal(response?.status(), 200, `${path}: HTTP ${response?.status()}`);
  await page.locator("#conteudo").waitFor({ state: "visible", timeout: 30_000 });
  return response;
}

async function processEditor(page: Page) {
  await navigate(page, "/ferramentas/editar-pdf");
  assert.match(await page.title(), /Editar PDF/i);
  for (const forbidden of ["Studio", "Modo preciso", "Foco", "Tela cheia", "Comandos"]) {
    assert.equal(await page.getByText(forbidden, { exact: true }).count(), 0, `Editor ainda expõe controle antigo: ${forbidden}`);
  }

  const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await page.getByRole("button", { name: "Selecionar PDF", exact: true }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(fixture("basic.pdf"));
  try {
    await page.locator(".pdf-editor-shell").waitFor({ state: "visible", timeout: 60_000 });
  } catch (error) {
    const visibleStatus = await page.locator(".editor-upload-card,.status-message,.editor-mode-loading").allTextContents().catch(() => []);
    throw new Error(`Editor não abriu após o upload. Estado visível: ${JSON.stringify(visibleStatus)}`, { cause: error });
  }
  await page.locator(".editor-pages > button").first().waitFor({ state: "visible", timeout: 60_000 });
  await page.locator(".editor-stage").waitFor({ state: "visible", timeout: 60_000 });

  for (const label of ["Selecionar", "Adicionar texto", "Destacar", "Redigir", "Comentário", "Assinatura", "Adicionar imagem"]) {
    assert.ok(await page.getByRole("button", { name: label, exact: true }).count(), `Editor unificado sem ferramenta ${label}`);
  }

  await page.getByRole("button", { name: "Adicionar texto", exact: true }).click();
  await page.locator(".editor-object-text").last().waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Destacar", exact: true }).click();
  await page.locator(".editor-object-highlight").last().waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Comentário", exact: true }).click();
  await page.locator(".editor-object-comment").last().waitFor({ state: "visible" });

  await page.getByRole("button", { name: "Duplicar", exact: true }).first().click();
  assert.ok(await page.locator(".editor-pages > button").count() >= 2, "Editor não duplicou a página");
  await page.getByRole("button", { name: "Em branco", exact: true }).click();
  assert.ok(await page.locator(".editor-pages > button").count() >= 3, "Editor não inseriu página em branco");

  await page.keyboard.press("Control+K");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "header-tool-search", "Ctrl+K deve abrir a busca global, não uma paleta de comandos do editor");
  await page.keyboard.press("Escape");

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: /Baixar PDF/ }).click(),
  ]);
  const target = join(downloadDir, `editar-pdf-${download.suggestedFilename()}`);
  await download.saveAs(target);
  await validateOutput("editar-pdf", target);
}

async function processTool(page: Page, slug: AllToolSlug) {
  if (slug === "editar-pdf") return processEditor(page);
  await navigate(page, `/ferramentas/${slug}`);
  assert.ok(await page.locator("h1").first().isVisible(), `${slug}: h1 ausente`);
  await page.locator(".premium-experience").waitFor({ state: "visible", timeout: 30_000 });

  const primary = page.locator('input[type="file"]').first();
  const first = await primaryFixture(slug);
  if (multiPdf.has(slug)) await primary.setInputFiles([first, fixture("one-page.pdf")]);
  else await primary.setInputFiles(first);
  await page.locator(".selected-files").waitFor({ state: "visible", timeout: 20_000 });
  await prepareTool(page, slug);

  const processButton = page.locator("button.process-button");
  await processButton.waitFor({ state: "visible" });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 75_000 }),
    processButton.click(),
  ]);
  const target = join(downloadDir, `${slug}-${download.suggestedFilename()}`);
  await download.saveAs(target);
  await validateOutput(slug, target);
  const error = page.locator(".status-message.error,.status-message.status-error");
  assert.equal(await error.count(), 0, `${slug}: terminou com erro visível`);
}

async function terminalErrorText(page: Page) {
  await page.waitForFunction(() => {
    const statuses = Array.from(document.querySelectorAll<HTMLElement>(".status-message.error,.status-message.status-error"));
    return statuses.some((status) => {
      const text = status.textContent || "";
      return text.trim().length > 0 && !/processando/i.test(text);
    });
  }, undefined, { timeout: 15_000 });
  const status = page.locator(".status-message.error,.status-message.status-error").filter({ hasNotText: /Processando/i }).first();
  return (await status.textContent()) || "";
}

async function negativeCases(page: Page) {
  console.log("QA negativo confirmação de senha divergente");
  await navigate(page, "/ferramentas/proteger-pdf");
  await page.locator('input[type="file"]').first().setInputFiles(fixture("basic.pdf"));
  const protectPasswords = page.locator('input[type="password"]');
  await protectPasswords.nth(0).fill("qa1234");
  await protectPasswords.nth(1).fill("qa5678");
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /confirmação|senha/i);

  console.log("QA negativo senha obrigatória para desbloquear");
  await navigate(page, "/ferramentas/desbloquear-pdf");
  await page.locator('input[type="file"]').first().setInputFiles(fixture("protected.pdf"));
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /informe|senha/i);

  console.log("QA negativo senha de proprietário obrigatória");
  await navigate(page, "/ferramentas/permissoes-pdf");
  await page.locator('input[type="file"]').first().setInputFiles(fixture("basic.pdf"));
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /proprietário|senha/i);
}

function captureErrors(page: Page, consoleErrors: string[], pageErrors: string[]) {
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${page.url()}: ${message.text()}`); });
  page.on("pageerror", (error) => pageErrors.push(`${page.url()}: ${error.message}`));
}

async function main() {
  await rm(downloadDir, { recursive: true, force: true });
  await mkdir(downloadDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const page = await context.newPage();
  captureErrors(page, consoleErrors, pageErrors);

  try {
    for (const tool of allTools) {
      console.log(`QA ${tool.slug}`);
      await processTool(page, tool.slug);
    }
    await context.close();

    const negativeContext = await browser.newContext({ acceptDownloads: false, viewport: { width: 1440, height: 900 } });
    await negativeContext.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
    const negativePage = await negativeContext.newPage();
    captureErrors(negativePage, consoleErrors, pageErrors);
    await negativeCases(negativePage);
    await negativeContext.close();

    assert.deepEqual(pageErrors, [], `Erros de página: ${pageErrors.join(" | ")}`);
    const relevantConsoleErrors = consoleErrors.filter((line) => !/favicon|adsbygoogle|ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(line));
    assert.deepEqual(relevantConsoleErrors, [], `Erros de console: ${relevantConsoleErrors.join(" | ")}`);
    console.log(JSON.stringify({ ok: true, suite: "browser-e2e", processedTools: allTools.length, negativeCases: 3, unifiedEditor: true }));
  } finally {
    await context.close().catch(() => undefined);
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
