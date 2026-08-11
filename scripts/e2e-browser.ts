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

async function processEditor(page: Page) {
  await page.goto(`${baseUrl}/ferramentas/editar-pdf`, { waitUntil: "networkidle" });
  assert.match(await page.title(), /Editar PDF/i);
  const input = page.locator('.studio-upload-card input[type="file"]');
  await input.setInputFiles(fixture("basic.pdf"));
  await page.locator(".studio-shell").waitFor({ state: "visible", timeout: 30_000 });

  for (const label of ["Selecionar", "Texto", "Caneta", "Destacar", "Linha", "Seta", "Retângulo", "Círculo", "Redigir", "Comentário", "Carimbo", "Assinar", "Imagem"]) {
    assert.ok(await page.getByRole("button", { name: label, exact: true }).count(), `Editor sem ferramenta ${label}`);
  }
  await page.getByRole("button", { name: "Grade", exact: true }).click();
  await page.getByRole("button", { name: "Snap", exact: true }).click();

  await page.getByRole("button", { name: "Retângulo", exact: true }).click();
  const stage = page.locator(".studio-stage");
  const box = await stage.boundingBox();
  assert.ok(box, "Studio sem área de edição");
  await page.mouse.move(box.x + box.width * .28, box.y + box.height * .3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .52, box.y + box.height * .46, { steps: 8 });
  await page.mouse.up();
  await page.locator(".studio-object.kind-rect").waitFor({ state: "visible" });

  await page.keyboard.press("Control+K");
  await page.locator(".premium-command-palette").waitFor({ state: "visible" });
  await page.locator(".premium-command-search input").fill("redação");
  assert.ok(await page.locator(".premium-command-list button").count() >= 1, "Paleta não encontrou redação");
  await page.keyboard.press("Escape");

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: /Baixar PDF/ }).click(),
  ]);
  const target = join(downloadDir, `editar-pdf-${download.suggestedFilename()}`);
  await download.saveAs(target);
  await validateOutput("editar-pdf", target);

  await page.getByRole("tab", { name: /Modo preciso/ }).click();
  await page.locator(".editor-upload-card,.pdf-editor-shell").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.getByRole("tab", { name: /Studio/ }).click();
  await page.locator(".studio-shell").waitFor({ state: "visible" });
  assert.ok(await page.locator(".studio-object.kind-rect").count(), "Sessão do Studio foi perdida ao alternar modos");
}

async function processTool(page: Page, slug: AllToolSlug) {
  if (slug === "editar-pdf") return processEditor(page);
  const response = await page.goto(`${baseUrl}/ferramentas/${slug}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${slug}: rota não retornou 200`);
  assert.ok(await page.locator("h1").first().isVisible(), `${slug}: h1 ausente`);
  assert.ok(await page.locator(".premium-experience").isVisible(), `${slug}: fluxo premium ausente`);

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
  }, undefined, { timeout: 25_000 });
  const status = page.locator(".status-message.error,.status-message.status-error").filter({ hasNotText: /Processando/i }).first();
  return (await status.textContent()) || "";
}

async function negativeCases(page: Page) {
  console.log("QA negativo confirmação de senha divergente");
  await page.goto(`${baseUrl}/ferramentas/proteger-pdf`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(fixture("basic.pdf"));
  const protectPasswords = page.locator('input[type="password"]');
  await protectPasswords.nth(0).fill("qa1234");
  await protectPasswords.nth(1).fill("qa5678");
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /confirmação|senha/i);

  console.log("QA negativo senha incorreta");
  await page.goto(`${baseUrl}/ferramentas/desbloquear-pdf`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(fixture("protected.pdf"));
  await page.locator('input[type="password"]').first().fill("senha-incorreta");
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /senha|password|desbloquear|criptograf/i);

  console.log("QA negativo PDF sem camada de texto");
  await page.goto(`${baseUrl}/ferramentas/pdf-para-word`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(fixture("image-only.pdf"));
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /OCR|texto/i);

  console.log("QA negativo destaque sem termo");
  await page.goto(`${baseUrl}/ferramentas/destacar-texto`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(fixture("basic.pdf"));
  await page.locator("button.process-button").click();
  assert.match(await terminalErrorText(page), /texto|destacar|informe/i);
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
    console.log(JSON.stringify({ ok: true, suite: "browser-e2e", processedTools: allTools.length, negativeCases: 4 }));
  } finally {
    await context.close().catch(() => undefined);
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
