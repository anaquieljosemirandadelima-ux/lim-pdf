import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allTools, advancedTools, isAdvancedToolSlug } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";

const memorySafe = new Set(["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"]);

async function source(path: string) {
  return readFile(path, "utf8");
}

async function main() {
  const publicTools = [...allTools, ...proTools];
  assert.equal(allTools.length, 41, "As 41 ferramentas consolidadas precisam permanecer registradas.");
  assert.equal(proTools.length, 17, "A suíte profissional precisa registrar 17 ferramentas novas.");
  assert.equal(publicTools.length, 58, "O catálogo público deve totalizar 58 ferramentas.");
  assert.equal(new Set(publicTools.map((tool) => tool.slug)).size, publicTools.length, "Slugs públicos devem ser únicos.");
  assert.equal(advancedTools.length, 9, "As nove ferramentas avançadas anteriores precisam permanecer registradas.");

  const [route, generic, sequential, advanced, proWorkspace, proEngines, studio, sitemap, telemetryBridge, telemetryLib, telemetryApi, nextConfig, sidebar] = await Promise.all([
    source("src/app/ferramentas/[slug]/page.tsx"),
    source("src/components/PdfToolWorkspace.tsx"),
    source("src/components/MemorySafePdfWorkspace.tsx"),
    source("src/components/AdvancedToolWorkspace.tsx"),
    source("src/components/ProPdfWorkspace.tsx"),
    source("src/lib/pro-pdf-engines.ts"),
    source("src/components/PdfEditorStudio.tsx"),
    source("src/app/sitemap.ts"),
    source("src/components/ToolTelemetryBridge.tsx"),
    source("src/lib/tool-telemetry.ts"),
    source("src/app/api/telemetry/route.ts"),
    source("next.config.ts"),
    source("src/components/AppSidebar.tsx"),
  ]);

  assert.match(route, /\[\.\.\.allTools, \.\.\.proTools\]\.map/, "A rota dinâmica deve gerar as 58 páginas a partir dos dois registros.");
  assert.match(route, /proToolBySlug\.get/, "A rota dinâmica deve resolver ferramentas profissionais.");
  assert.match(route, /allToolBySlug\.get/, "A rota dinâmica deve preservar o registro consolidado.");
  assert.match(route, /ProPdfWorkspace/, "Ferramentas profissionais precisam usar workspace real.");
  assert.match(route, /ToolTelemetryBridge/, "Todas as variantes devem manter a ponte de telemetria sanitizada.");

  for (const tool of allTools) {
    if (tool.slug === "editar-pdf") {
      assert.match(route, /PdfEditorExperienceSwitcher/);
      continue;
    }
    if (memorySafe.has(tool.slug)) {
      assert.match(sequential, new RegExp(`"${tool.slug}"`), `Workspace sequencial sem ${tool.slug}`);
      continue;
    }
    if (isAdvancedToolSlug(tool.slug)) {
      assert.ok(advanced.includes(`"${tool.slug}"`), `Workspace avançado sem ${tool.slug}`);
      continue;
    }
    assert.match(generic, new RegExp(`"${tool.slug}"\\s*:`), `Dispatcher genérico sem ${tool.slug}`);
  }

  for (const tool of proTools) assert.ok(proWorkspace.includes(`tool.slug === "${tool.slug}"`) || proWorkspace.includes(`["reparar-pdf", "pdf-para-powerpoint", "powerpoint-para-pdf", "extrair-imagens-pdf"]`), `Workspace profissional sem fluxo para ${tool.slug}`);

  for (const capability of [
    "ocrPdf", "signPdfPades", "addHyperlink", "createFormPdf", "addBookmarks", "comparePdfs", "repairPdf", "preparePdfA", "pdfToPptx", "pptxToPdf", "extractEmbeddedImages", "cleanScannedPdf", "optimizePdfAdvanced", "addNativeAnnotation", "processBatch", "addBates", "editMetadata",
  ]) assert.ok(proEngines.includes(`function ${capability}`) || proEngines.includes(`async function ${capability}`) || proEngines.includes(`export async function ${capability}`), `Motor profissional deve manter ${capability}`);

  assert.ok(proEngines.includes("tesseract.js@7.0.0"), "OCR deve usar motor Tesseract real e versionado.");
  assert.ok(proEngines.includes("ETSI.CAdES.detached"), "Assinatura digital deve gerar CMS/PAdES básico.");
  assert.ok(proEngines.includes('PDFName.of("Link")'), "Hyperlinks devem ser annotations PDF nativas.");
  assert.ok(proEngines.includes("createTextField") && proEngines.includes("createCheckBox") && proEngines.includes("createRadioGroup"), "Criador de formulário deve usar AcroForm real.");
  assert.ok(proEngines.includes('PDFName.of("Outlines")'), "Marcadores devem usar Outline PDF nativo.");

  for (const capability of ["pen", "line", "arrow", "rect", "ellipse", "highlight", "redact", "comment", "stamp", "signature", "image", "duplicatePage", "insertBlankPage", "deletePage", "findNextText", "exportPdf", "undo", "redo"]) {
    assert.ok(studio.includes(capability), `Studio deve manter a capacidade ${capability}`);
  }

  assert.ok(sitemap.includes("proTools"), "Sitemap deve incluir ferramentas profissionais.");
  assert.ok(!sitemap.includes('"/faq"'), "FAQ antiga não deve voltar ao sitemap.");
  assert.ok(!sitemap.includes('"/sobre"'), "Sobre antigo não deve voltar ao sitemap.");
  assert.ok(nextConfig.includes("https://cdn.jsdelivr.net"), "CSP deve liberar somente o CDN necessário ao motor OCR carregado sob demanda.");
  assert.ok(sidebar.includes("reference-sidebar-label"), "Sidebar precisa renderizar rótulo animado no hover/foco.");
  assert.ok(telemetryBridge.includes("file.size") && !telemetryBridge.includes("file.name"), "Telemetria cliente não pode coletar nome de arquivo.");
  assert.ok(telemetryBridge.includes("lastUiError.current = \"\""), "Falhas repetidas precisam voltar a ser contadas depois que o erro some.");
  assert.ok(telemetryLib.includes('localStorage.getItem(CONSENT_KEY) === "accepted"'), "Medição só pode ser enviada após consentimento opcional explícito.");
  assert.ok(telemetryApi.includes("request.body?.getReader()"), "Endpoint deve limitar corpo enquanto lê o stream.");
  assert.ok(telemetryApi.includes("configuredSampleRate"), "Servidor deve derivar peso amostral de política confiável.");
  assert.ok(telemetryApi.includes("rateLimited"), "Endpoint público deve aplicar rate limit.");
  assert.ok(telemetryApi.includes("proTools"), "Telemetria deve reconhecer os 58 slugs públicos.");
  assert.ok(telemetryApi.includes("Nunca registrar nome do arquivo"), "Endpoint deve documentar a restrição de privacidade.");
  assert.ok(!telemetryApi.includes("user-agent"), "User-Agent bruto não deve ser lido pelo endpoint.");

  console.log(JSON.stringify({ ok: true, suite: "tool-matrix", legacyTools: allTools.length, proTools: proTools.length, totalTools: publicTools.length, advanced: advancedTools.length, memorySafe: memorySafe.size, realOcr: true, padesBasic: true, nativePdfFeatures: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
