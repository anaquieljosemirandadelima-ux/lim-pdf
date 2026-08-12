import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allTools, advancedTools, isAdvancedToolSlug } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";

const memorySafe = new Set(["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"]);
const STANDALONE_FLOWS = 4;

async function source(path: string) { return readFile(path, "utf8"); }

async function main() {
  assert.equal(allTools.length, 41, "O registro central precisa manter as 41 ferramentas consolidadas.");
  assert.equal(new Set(allTools.map((tool) => tool.slug)).size, allTools.length, "Slugs core devem ser únicos.");
  assert.equal(advancedTools.length, 9, "As nove ferramentas avançadas core precisam permanecer registradas.");
  assert.equal(proTools.length, 16, "A suíte profissional limpa deve expor 16 ferramentas além do OCR dedicado.");
  assert.equal(new Set(proTools.map((tool) => tool.slug)).size, proTools.length, "Slugs profissionais devem ser únicos.");
  assert.equal(allTools.length + proTools.length + STANDALONE_FLOWS, 61, "A navegação pública deve fechar 61 fluxos úteis.");

  const [route, generic, sequential, advanced, editorSwitcher, editor, sitemap, telemetryBridge, telemetryLib, telemetryApi, converter, ocr, sidebar, search, consent, footer, adRoute, proRegistry, proEngines, proWorkspace, linksWorkspace, navigationWorkspace, preflight] = await Promise.all([
    source("src/app/ferramentas/[slug]/page.tsx"),
    source("src/components/PdfToolWorkspace.tsx"),
    source("src/components/MemorySafePdfWorkspace.tsx"),
    source("src/components/AdvancedToolWorkspace.tsx"),
    source("src/components/PdfEditorExperienceSwitcher.tsx"),
    source("src/components/PdfEditorWorkspaceHardened.tsx"),
    source("src/app/sitemap.ts"),
    source("src/components/ToolTelemetryBridge.tsx"),
    source("src/lib/tool-telemetry.ts"),
    source("src/app/api/telemetry/route.ts"),
    source("src/components/UnifiedConverterWorkspace.tsx"),
    source("src/lib/ocr-engine.ts"),
    source("src/components/AppSidebar.tsx"),
    source("src/components/HeaderToolSearch.tsx"),
    source("src/components/ConsentBanner.tsx"),
    source("src/components/SiteFooter.tsx"),
    source("src/components/AdSenseRouteLoader.tsx"),
    source("src/lib/pro-tools.ts"),
    source("src/lib/pro-pdf-engines.ts"),
    source("src/components/ProPdfWorkspace.tsx"),
    source("src/components/ProLinksWorkspace.tsx"),
    source("src/components/ProNavigationWorkspace.tsx"),
    source("src/components/PreflightWorkspace.tsx"),
  ]);

  assert.match(route, /\.\.\.allTools, \.\.\.proTools/, "A rota dinâmica deve gerar parâmetros core e profissionais.");
  assert.match(route, /proToolBySlug\.get/, "A rota deve resolver ferramentas profissionais pelo registro limpo.");
  assert.match(route, /ProPdfWorkspace|ProLinksWorkspace|ProNavigationWorkspace/, "A rota deve expor workspaces profissionais reais.");
  assert.match(route, /UnifiedConverterWorkspace/, "Rotas de saída devem reaproveitar o conversor unificado.");
  assert.ok(!route.includes("ToolEditorialPanel"), "Ferramentas não devem renderizar blocos Sobre, dúvidas ou guias.");
  assert.match(route, /AdSlot/, "Páginas de ferramentas devem reservar espaço publicitário fora do workspace.");

  for (const tool of allTools) {
    if (tool.slug === "editar-pdf") { assert.match(route, /PdfEditorExperienceSwitcher/); continue; }
    if (memorySafe.has(tool.slug)) { assert.match(sequential, new RegExp(`"${tool.slug}"`), `Workspace sequencial sem ${tool.slug}`); continue; }
    if (isAdvancedToolSlug(tool.slug)) { assert.ok(advanced.includes(`"${tool.slug}"`), `Workspace avançado sem ${tool.slug}`); continue; }
    assert.match(generic, new RegExp(`"${tool.slug}"\\s*:`), `Dispatcher genérico sem ${tool.slug}`);
  }

  assert.ok(editorSwitcher.includes("PdfEditorWorkspaceHardened") && !editorSwitcher.includes("PdfEditorStudio"), "Editar PDF deve usar somente um editor.");
  assert.ok(!editorSwitcher.includes("Modo preciso") && !editorSwitcher.includes("Studio") && !editorSwitcher.includes("EditorCommandBar"), "O seletor de modos antigo não pode voltar.");
  for (const capability of ["addText", "addImage", "addRedaction", "addHighlight", "addComment", "addSignature", "duplicatePage", "insertBlankPage", "deletePage", "copySelected", "duplicateSelected", "pasteSelected", "alignSelected", "distributeSelected", "moveLayer", "exportPdf", "undo", "redo", "text-replacement"]) assert.ok(editor.includes(capability), `Editor unificado deve manter ${capability}`);
  assert.ok(!route.includes("editor /><div className=\"reference-editor-wrap\""), "Editar PDF não deve renderizar a camada antiga de Foco/Tela cheia/Comandos.");

  assert.ok(converter.includes("DataTransfer") && converter.includes("Converter para"), "Conversor deve preservar o arquivo ao trocar a saída.");
  assert.ok(ocr.includes("Tesseract") && ocr.includes("parseTsvWords") && ocr.includes("drawText") && ocr.includes("MAX_RASTER_PIXELS"), "OCR deve criar camada pesquisável com limite de memória.");

  for (const marker of ["Organizar PDF", "OCR e digitalização", "Assinar PDF", "Formulários PDF", "Segurança PDF"]) assert.ok(sidebar.includes(marker), `Sidebar sem nicho ${marker}`);
  assert.ok(search.includes("searchScore") && search.includes("aliases") && search.includes("Ctrl K") && search.includes("navigationGroups") && search.includes("proTools"), "Busca global deve cobrir intenção, categorias e suíte profissional.");
  assert.ok(consent.includes("Cookies no LIM PDF") && consent.includes("Só essenciais") && consent.includes("Opções"), "Consentimento deve permanecer compacto e configurável.");
  assert.ok(footer.includes("LIM PDF pertence ao LIM Group") && !footer.includes("/guias") && !footer.includes("/sobre") && !footer.includes("/contato"), "Rodapé deve ser mínimo, identificar o LIM Group e não ter conteúdo institucional.");
  assert.ok(adRoute.includes("AdSenseLoader") && !adRoute.includes("purgeAdSenseFromInteractiveRoute"), "AdSense não pode ser removido das rotas de ferramentas.");

  for (const slug of ["assinatura-digital-pdf", "links-pdf", "criar-formulario-pdf", "bookmarks-pdf", "comparar-pdfs", "reparar-pdf", "pdf-a", "pdf-para-powerpoint", "powerpoint-para-pdf", "extrair-imagens-pdf", "limpar-documento-digitalizado", "otimizar-pdf-avancado", "anotacoes-pdf", "processamento-lote-pdf", "numeracao-bates", "editar-metadados-pdf"]) assert.ok(proRegistry.includes(`"${slug}"`), `Registro profissional sem ${slug}`);
  for (const capability of ["addHyperlink", "addInternalPageLink", "addNativeAnnotation", "createFormPdf", "addBookmarks", "comparePdfs", "repairPdf", "preparePdfA", "pdfToPptx", "pptxToPdf", "extractEmbeddedImages", "cleanScannedPdf", "optimizePdfAdvanced", "processBatch", "addBates", "editMetadata", "signPdfPades"]) assert.ok(proEngines.includes(capability), `Barrel profissional sem ${capability}`);
  assert.ok(proWorkspace.includes("signPdfPades") && proWorkspace.includes("processBatch") && proWorkspace.includes("pdfToPptx"), "Workspace profissional precisa ligar motores reais.");
  assert.ok(linksWorkspace.includes("readHyperlinks") && linksWorkspace.includes("removeAllHyperlinks"), "Workspace de links deve editar estrutura existente.");
  assert.ok(navigationWorkspace.includes("addBookmarks"), "Workspace de marcadores deve gerar outlines.");
  assert.ok(preflight.includes("getTextContent") && preflight.includes("getAnnotations") && preflight.includes("getForm"), "Preflight deve analisar conteúdo e estrutura reais.");

  assert.ok(sitemap.includes("proTools"), "Sitemap deve derivar URLs profissionais do registro real.");
  assert.ok(!sitemap.includes('"/faq"'), "FAQ antiga não pode voltar.");
  for (const removed of ["/sobre", "/guias", "/contato"]) assert.ok(!sitemap.includes(`"${removed}"`), `Sitemap não deve conter ${removed}`);
  for (const marker of ["/ferramentas/ocr-pdf", "/ferramentas/converter-pdf", "/ferramentas/dimensionar-pdf", "/ferramentas/preflight-pdf"]) assert.ok(sitemap.includes(`"${marker}"`), `Sitemap sem ${marker}`);

  assert.ok(telemetryBridge.includes("file.size") && !telemetryBridge.includes("file.name"), "Telemetria cliente não pode coletar nome de arquivo.");
  assert.ok(telemetryBridge.includes("lastUiError.current = \"\""), "Falhas repetidas precisam voltar a ser contadas.");
  assert.ok(telemetryLib.includes('localStorage.getItem(CONSENT_KEY) === "accepted"'), "Medição só após consentimento opcional.");
  assert.ok(telemetryApi.includes("request.body?.getReader()") && telemetryApi.includes("MAX_REQUEST_BYTES"), "Endpoint deve limitar o corpo durante leitura.");
  assert.ok(!telemetryApi.includes("user-agent"), "User-Agent bruto não deve ser lido.");

  console.log(JSON.stringify({ ok: true, suite: "tool-matrix", coreTools: allTools.length, professionalTools: proTools.length, standaloneFlows: STANDALONE_FLOWS, publicFlows: 61, advancedCore: advancedTools.length, memorySafe: memorySafe.size, cleanRelease: true, unifiedEditor: true, globalSearch: true, adsOnTools: true, editorialRemoved: true, realOcr: true, pades: true, unifiedConverter: true, preflight: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
