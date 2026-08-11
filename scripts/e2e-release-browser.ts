import assert from "node:assert/strict";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium, type Page } from "playwright-core";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const QA_DIR = process.env.QA_DIR || "/tmp/limpdf-qa";
const OUT_DIR = process.env.QA_RELEASE_OUT || "/tmp/limpdf-release-downloads";
const basicPdf = path.join(QA_DIR, "basic.pdf");

async function ensureFixture() { const info = await stat(basicPdf).catch(() => null); assert.ok(info?.size, `Fixture ausente: ${basicPdf}`); await mkdir(OUT_DIR, { recursive: true }); }
async function goto(page: Page, route: string) { await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 }); await page.locator("h1").first().waitFor({ state: "visible", timeout: 15_000 }); }
async function uploadPdf(page: Page) { const input = page.locator('input[type="file"][accept*="pdf"]').first(); await input.setInputFiles(basicPdf); }
async function saveDownload(page: Page, click: () => Promise<void>, name: string) { const waiting = page.waitForEvent("download", { timeout: 60_000 }); await click(); const download = await waiting; const output = path.join(OUT_DIR, name); await download.saveAs(output); const info = await stat(output); assert.ok(info.size > 40, `${name}: download vazio`); return output; }

async function converter(page: Page) {
  await goto(page, "/ferramentas/converter-pdf"); await uploadPdf(page); await page.locator(".converter-file-summary").waitFor({ state: "visible", timeout: 15_000 });
  const target = page.locator(".converter-primary-action select"); await target.selectOption("txt"); await page.locator(".converter-cta").filter({ hasText: "Texto (TXT)" }).waitFor({ state: "visible" });
  const output = await saveDownload(page, () => page.locator(".converter-cta").click(), "converter-troca-formato.txt"); const text = await readFile(output, "utf8"); assert.ok(text.length > 20, "Conversor: TXT sem conteúdo");
  assert.equal((await page.locator('input[type="file"][accept*="pdf"]').first().inputValue()), "", "file input não deve expor caminho local");
}

async function normalizePages(page: Page) {
  await goto(page, "/ferramentas/normalizar-paginas-pdf"); await uploadPdf(page); await page.locator(".selected-file-row").waitFor({ state: "visible" });
  const selects = page.locator(".page-normalize-options select"); await selects.nth(0).selectOption("a4"); await selects.nth(1).selectOption("landscape"); await selects.nth(2).selectOption("fit");
  const output = await saveDownload(page, () => page.getByRole("button", { name: /Aplicar tamanho e baixar/ }).click(), "dimensionado-a4-paisagem.pdf");
  const pdf = await PDFDocument.load(await readFile(output)); const first = pdf.getPage(0).getSize(); const expectedW = 297 * 72 / 25.4; const expectedH = 210 * 72 / 25.4;
  assert.ok(Math.abs(first.width - expectedW) < 1.5 && Math.abs(first.height - expectedH) < 1.5, `Dimensão incorreta: ${first.width} x ${first.height}`);
}

async function preflight(page: Page) {
  await goto(page, "/ferramentas/preflight-pdf"); await uploadPdf(page); await page.getByRole("button", { name: /Analisar PDF/ }).click(); await page.locator(".preflight-report").waitFor({ state: "visible", timeout: 30_000 });
  const text = await page.locator(".preflight-report").innerText(); assert.match(text, /Diagnóstico concluído/); assert.match(text, /páginas com texto/); assert.match(text, /Recomendações/);
}

async function editorSizing(page: Page) {
  await goto(page, "/ferramentas/editar-pdf"); await uploadPdf(page); await page.locator(".studio-shell").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator(".editor-utility-trigger").click(); await page.locator(".editor-utility-panel").waitFor({ state: "visible" });
  const selects = page.locator(".editor-utility-grid select"); await selects.nth(0).selectOption("a4"); await selects.nth(1).selectOption("landscape"); await selects.nth(2).selectOption("fit"); await selects.nth(3).selectOption("current");
  await page.locator(".editor-size-apply").click(); await page.locator(".studio-page-size-badge").filter({ hasText: "297" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.locator(".studio-pro-trigger").click(); await page.locator(".studio-pro-panel").waitFor({ state: "visible" }); await page.locator(".studio-pro-trigger").click();
  const output = await saveDownload(page, () => page.locator(".studio-top-actions .primary-button").click(), "editor-a4-paisagem.pdf"); const pdf = await PDFDocument.load(await readFile(output)); const first = pdf.getPage(0).getSize();
  assert.ok(first.width > first.height && Math.abs(first.width - 297 * 72 / 25.4) < 2, "Editor não exportou página A4 paisagem");
}

async function sidebarTooltip(page: Page) {
  await goto(page, "/"); const link = page.locator('.reference-sidebar a[href="/ferramentas/converter-pdf"]'); await link.hover(); const tooltip = link.locator(".reference-sidebar-label"); await tooltip.waitFor({ state: "visible", timeout: 5_000 }); assert.equal((await tooltip.textContent())?.trim(), "Converter");
}

async function main() {
  await ensureFixture(); const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] }); const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }); const page = await context.newPage(); const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try { await converter(page); await normalizePages(page); await preflight(page); await editorSizing(page); await sidebarTooltip(page); assert.deepEqual(errors, [], `Erros de runtime: ${errors.join(" | ")}`); console.log(JSON.stringify({ ok: true, suite: "release-browser", converter: true, pageSizing: true, preflight: true, editorSizing: true, sidebarTooltip: true })); }
  finally { await context.close(); await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
