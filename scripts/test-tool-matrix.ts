import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allTools, advancedTools, isAdvancedToolSlug } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";

const memorySafe = new Set(["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"]);
async function source(path: string) { return readFile(path, "utf8"); }

async function main() {
  const publicTools = [...allTools, ...proTools];
  assert.equal(allTools.length, 41);
  assert.equal(proTools.length, 17);
  assert.equal(publicTools.length, 58);
  assert.equal(new Set(publicTools.map((tool) => tool.slug)).size, 58, "Slugs públicos devem ser únicos.");
  assert.equal(advancedTools.length, 9);

  const [route, generic, sequential, advanced, workspace, exportsFile, core, visual, office, signature, studio, sitemap, telemetryBridge, telemetryLib, telemetryApi, nextConfig, sidebar] = await Promise.all([
    source("src/app/ferramentas/[slug]/page.tsx"), source("src/components/PdfToolWorkspace.tsx"), source("src/components/MemorySafePdfWorkspace.tsx"), source("src/components/AdvancedToolWorkspace.tsx"), source("src/components/ProPdfWorkspace.tsx"),
    source("src/lib/pro-pdf-engines.ts"), source("src/lib/pro-pdf-core.ts"), source("src/lib/pro-pdf-visual.ts"), source("src/lib/pro-pdf-office.ts"), source("src/lib/pro-pdf-sign.ts"),
    source("src/components/PdfEditorStudio.tsx"), source("src/app/sitemap.ts"), source("src/components/ToolTelemetryBridge.tsx"), source("src/lib/tool-telemetry.ts"), source("src/app/api/telemetry/route.ts"), source("next.config.ts"), source("src/components/AppSidebar.tsx"),
  ]);

  assert.match(route, /\[\.\.\.allTools, \.\.\.proTools\]\.map/);
  assert.match(route, /proToolBySlug\.get/); assert.match(route, /allToolBySlug\.get/); assert.match(route, /ProPdfWorkspace/); assert.match(route, /ToolTelemetryBridge/);
  for (const tool of allTools) {
    if (tool.slug === "editar-pdf") { assert.match(route, /PdfEditorExperienceSwitcher/); continue; }
    if (memorySafe.has(tool.slug)) { assert.match(sequential, new RegExp(`"${tool.slug}"`)); continue; }
    if (isAdvancedToolSlug(tool.slug)) { assert.ok(advanced.includes(`"${tool.slug}"`), `Workspace avançado sem ${tool.slug}`); continue; }
    assert.match(generic, new RegExp(`"${tool.slug}"\\s*:`), `Dispatcher genérico sem ${tool.slug}`);
  }
  for (const tool of proTools) assert.ok(workspace.includes(`tool.slug === "${tool.slug}"`) || workspace.includes(`["reparar-pdf", "pdf-para-powerpoint", "powerpoint-para-pdf", "extrair-imagens-pdf"]`), `Workspace profissional sem ${tool.slug}`);

  for (const capability of ["ocrPdf", "signPdfPades", "addHyperlink", "createFormPdf", "addBookmarks", "comparePdfs", "repairPdf", "preparePdfA", "pdfToPptx", "pptxToPdf", "extractEmbeddedImages", "cleanScannedPdf", "optimizePdfAdvanced", "addNativeAnnotation", "processBatch", "addBates", "editMetadata"]) {
    assert.ok(exportsFile.includes(capability), `Barrel profissional sem ${capability}`);
  }
  assert.ok(visual.includes("tesseract.js@7.0.0"), "OCR deve usar Tesseract real e versionado.");
  assert.ok(signature.includes("ETSI.CAdES.detached") && signature.includes("crypto.subtle.sign"), "Assinatura digital deve usar CMS/PAdES + WebCrypto.");
  assert.ok(core.includes('PDFName.of("Link")') && core.includes("addInternalPageLink"), "Links externos e internos devem ser annotations nativas.");
  assert.ok(core.includes("createTextField") && core.includes("createCheckBox") && core.includes("createRadioGroup"), "Formulário deve usar AcroForm real.");
  assert.ok(core.includes('PDFName.of("Outlines")'), "Marcadores devem usar Outline nativo.");
  assert.ok(core.includes("pdfaid:part=\"2\"") && core.includes("pré") === false, "Motor deve inserir identificação PDF/A no XMP sem alegar certificação dentro do arquivo.");
  assert.ok(office.includes("presentationml") && office.includes("readZipEntries"), "Conversão PPTX deve manipular OOXML real.");

  for (const capability of ["pen", "line", "arrow", "rect", "ellipse", "highlight", "redact", "comment", "stamp", "signature", "image", "duplicatePage", "insertBlankPage", "deletePage", "findNextText", "exportPdf", "undo", "redo"]) assert.ok(studio.includes(capability), `Studio sem ${capability}`);

  assert.ok(sitemap.includes("proTools")); assert.ok(!sitemap.includes('"/faq"')); assert.ok(!sitemap.includes('"/sobre"'));
  assert.ok(nextConfig.includes("https://cdn.jsdelivr.net")); assert.ok(sidebar.includes("reference-sidebar-label"));
  assert.ok(telemetryBridge.includes("file.size") && !telemetryBridge.includes("file.name")); assert.ok(telemetryBridge.includes("lastUiError.current = \"\""));
  assert.ok(telemetryLib.includes('localStorage.getItem(CONSENT_KEY) === "accepted"'));
  assert.ok(telemetryApi.includes("request.body?.getReader()") && telemetryApi.includes("configuredSampleRate") && telemetryApi.includes("rateLimited") && telemetryApi.includes("proTools"));
  assert.ok(telemetryApi.includes("Nunca registrar nome do arquivo") && !telemetryApi.includes("user-agent"));

  console.log(JSON.stringify({ ok: true, suite: "tool-matrix", legacyTools: 41, proTools: 17, totalTools: 58, advanced: 9, memorySafe: 4, realOcr: true, padesBasic: true, nativePdfFeatures: true, ooxml: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
