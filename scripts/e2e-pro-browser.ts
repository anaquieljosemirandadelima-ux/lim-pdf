import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright-core";
import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { proTools, type ProToolSlug } from "../src/lib/pro-tools";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const fixtureDir = process.env.LIMPDF_QA_DIR || "/tmp/limpdf-qa";
const downloadDir = process.env.LIMPDF_PRO_DOWNLOAD_DIR || "/tmp/limpdf-pro-downloads";
const fixture = (name: string) => join(fixtureDir, name);

async function validatePdf(path: string) {
  const bytes = new Uint8Array(await readFile(path));
  assert.ok(new TextDecoder().decode(bytes.slice(0, 8)).startsWith("%PDF-"), `${path}: saída não é PDF`);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.ok(pdf.getPageCount() >= 1, `${path}: PDF sem páginas`);
  return { bytes, pdf };
}

async function outputFor(page: Page, slug: ProToolSlug, timeout = 90_000) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout }),
    page.locator("button.process-button").click(),
  ]);
  const target = join(downloadDir, `${slug}-${download.suggestedFilename()}`);
  await download.saveAs(target);
  const error = page.locator(".status-message.error");
  assert.equal(await error.count(), 0, `${slug}: terminou com erro visível`);
  return target;
}

async function openTool(page: Page, slug: ProToolSlug, files: string | string[]) {
  const response = await page.goto(`${baseUrl}/ferramentas/${slug}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${slug}: HTTP ${response?.status()}`);
  assert.ok(await page.locator(".pro-pdf-workspace").isVisible(), `${slug}: workspace profissional invisível`);
  await page.locator('.drop-zone input[type="file"]').setInputFiles(files);
  await page.locator(".selected-files").waitFor({ state: "visible", timeout: 20_000 });
}

async function fillInput(page: Page, labelText: string, value: string) {
  const label = page.locator(".pro-tool-options label").filter({ hasText: labelText }).first();
  await label.locator("input").fill(value);
}

async function runDeterministic(page: Page) {
  await openTool(page, "links-pdf", fixture("basic.pdf"));
  await fillInput(page, "URL", "https://limpdf.com.br/ferramentas");
  const linkPath = await outputFor(page, "links-pdf");
  const linkPdf = (await validatePdf(linkPath)).pdf;
  assert.ok(linkPdf.getPages()[0].node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.size(), "Link E2E não criou annotation");

  await openTool(page, "anotacoes-pdf", fixture("basic.pdf"));
  await page.locator(".pro-tool-options select").first().selectOption("highlight");
  const annotationPath = await outputFor(page, "anotacoes-pdf");
  assert.ok((await validatePdf(annotationPath)).pdf.getPages()[0].node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.size(), "Anotação E2E ausente");

  await openTool(page, "criar-formulario-pdf", fixture("basic.pdf"));
  await page.getByRole("button", { name: /Adicionar campo/ }).click();
  const formPath = await outputFor(page, "criar-formulario-pdf");
  assert.ok((await validatePdf(formPath)).pdf.getForm().getFields().length >= 1, "Formulário E2E sem campos");

  await openTool(page, "bookmarks-pdf", fixture("basic.pdf"));
  await page.getByRole("button", { name: /Adicionar marcador/ }).click();
  const bookmarkPath = await outputFor(page, "bookmarks-pdf");
  assert.ok((await validatePdf(bookmarkPath)).pdf.catalog.lookupMaybe(PDFName.of("Outlines"), PDFDict), "Bookmark E2E ausente");

  await openTool(page, "comparar-pdfs", [fixture("basic.pdf"), fixture("one-page.pdf")]);
  await validatePdf(await outputFor(page, "comparar-pdfs", 120_000));

  await openTool(page, "reparar-pdf", fixture("basic.pdf"));
  await validatePdf(await outputFor(page, "reparar-pdf"));

  await openTool(page, "pdf-a", fixture("basic.pdf"));
  const pdfa = await validatePdf(await outputFor(page, "pdf-a"));
  assert.ok(pdfa.pdf.catalog.lookupMaybe(PDFName.of("Metadata")), "PDF/A preparation sem XMP");

  await openTool(page, "extrair-imagens-pdf", fixture("image-only.pdf"));
  const imageZip = new Uint8Array(await readFile(await outputFor(page, "extrair-imagens-pdf")));
  assert.equal(imageZip[0], 0x50); assert.equal(imageZip[1], 0x4b);

  await openTool(page, "limpar-documento-digitalizado", fixture("basic.pdf"));
  await validatePdf(await outputFor(page, "limpar-documento-digitalizado", 120_000));

  await openTool(page, "otimizar-pdf-avancado", fixture("basic.pdf"));
  await validatePdf(await outputFor(page, "otimizar-pdf-avancado"));

  await openTool(page, "processamento-lote-pdf", [fixture("basic.pdf"), fixture("one-page.pdf")]);
  const batchZip = new Uint8Array(await readFile(await outputFor(page, "processamento-lote-pdf")));
  assert.equal(batchZip[0], 0x50); assert.equal(batchZip[1], 0x4b);

  await openTool(page, "numeracao-bates", fixture("basic.pdf"));
  await fillInput(page, "Prefixo", "E2E-");
  await validatePdf(await outputFor(page, "numeracao-bates"));

  await openTool(page, "editar-metadados-pdf", fixture("basic.pdf"));
  await fillInput(page, "Título", "LIM PDF E2E PRO");
  const metaPdf = (await validatePdf(await outputFor(page, "editar-metadados-pdf"))).pdf;
  assert.equal(metaPdf.getTitle(), "LIM PDF E2E PRO");

  await openTool(page, "pdf-para-powerpoint", fixture("one-page.pdf"));
  const pptxPath = await outputFor(page, "pdf-para-powerpoint", 120_000);
  const pptxBytes = new Uint8Array(await readFile(pptxPath)); assert.equal(pptxBytes[0], 0x50); assert.equal(pptxBytes[1], 0x4b);

  await openTool(page, "powerpoint-para-pdf", pptxPath);
  await validatePdf(await outputFor(page, "powerpoint-para-pdf"));
}

async function runSignature(page: Page) {
  const temp = await mkdtemp(join(tmpdir(), "limpdf-e2e-sign-"));
  try {
    const keyPath = join(temp, "key.pem"); const certPath = join(temp, "cert.pem"); const pkcs8Path = join(temp, "pkcs8.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", keyPath, "-out", certPath, "-sha256", "-days", "1", "-nodes", "-subj", "/CN=LIM PDF Browser E2E"], { stdio: "ignore" });
    execFileSync("openssl", ["pkcs8", "-topk8", "-inform", "PEM", "-outform", "PEM", "-nocrypt", "-in", keyPath, "-out", pkcs8Path], { stdio: "ignore" });
    await openTool(page, "assinatura-digital-pdf", fixture("basic.pdf"));
    const inputs = page.locator('input[type="file"]');
    await inputs.nth(1).setInputFiles(certPath); await inputs.nth(2).setInputFiles(pkcs8Path);
    await fillInput(page, "Assinante", "LIM PDF Browser E2E");
    const path = await outputFor(page, "assinatura-digital-pdf", 120_000);
    const { bytes } = await validatePdf(path);
    assert.ok(new TextDecoder("latin1").decode(bytes).includes("/ETSI.CAdES.detached"), "PAdES E2E sem SubFilter esperado");
  } finally { await rm(temp, { recursive: true, force: true }); }
}

async function runOcr(page: Page) {
  await openTool(page, "ocr-pdf", fixture("one-page.pdf"));
  const path = await outputFor(page, "ocr-pdf", 180_000);
  const { bytes } = await validatePdf(path);
  assert.ok(bytes.length > 1_000, "OCR E2E gerou saída pequena demais");
}

async function main() {
  await rm(downloadDir, { recursive: true, force: true }); await mkdir(downloadDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const page = await context.newPage();
  const pageErrors: string[] = []; const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !/favicon|adsbygoogle|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) consoleErrors.push(`${page.url()}: ${message.text()}`); });
  try {
    await runDeterministic(page);
    await runSignature(page);
    await runOcr(page);
    assert.deepEqual(pageErrors, [], pageErrors.join(" | "));
    assert.deepEqual(consoleErrors, [], consoleErrors.join(" | "));
    assert.equal(proTools.length, 17);
    console.log(JSON.stringify({ ok: true, suite: "pro-browser-e2e", professionalTools: 17, processedFlows: 17, realOcr: true, pades: true, pptxRoundTrip: true }));
  } finally { await context.close(); await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
