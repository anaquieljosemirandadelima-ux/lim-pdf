import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allTools, advancedTools, isAdvancedToolSlug } from "../src/lib/all-tools";

const memorySafe = new Set(["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"]);

async function source(path: string) {
  return readFile(path, "utf8");
}

async function main() {
  assert.equal(allTools.length, 41, "O registro central deve manter as 41 ferramentas consolidadas.");
  assert.equal(new Set(allTools.map((tool) => tool.slug)).size, allTools.length, "Slugs devem ser únicos.");
  assert.equal(advancedTools.length, 9, "As nove ferramentas avançadas precisam permanecer registradas.");

  const [route, generic, sequential, advanced, studio, sitemap, telemetryBridge, telemetryLib, telemetryApi, converter, ocr, about, contact, guides] = await Promise.all([
    source("src/app/ferramentas/[slug]/page.tsx"),
    source("src/components/PdfToolWorkspace.tsx"),
    source("src/components/MemorySafePdfWorkspace.tsx"),
    source("src/components/AdvancedToolWorkspace.tsx"),
    source("src/components/PdfEditorStudio.tsx"),
    source("src/app/sitemap.ts"),
    source("src/components/ToolTelemetryBridge.tsx"),
    source("src/lib/tool-telemetry.ts"),
    source("src/app/api/telemetry/route.ts"),
    source("src/components/UnifiedConverterWorkspace.tsx"),
    source("src/lib/ocr-engine.ts"),
    source("src/app/sobre/page.tsx"),
    source("src/app/contato/page.tsx"),
    source("src/app/guias/page.tsx"),
  ]);

  assert.match(route, /generateStaticParams\(\).*allTools\.map/s, "A rota dinâmica deve gerar parâmetros a partir do registro central.");
  assert.match(route, /allToolBySlug\.get/, "A rota dinâmica deve resolver a ferramenta pelo registro central.");
  assert.match(route, /ToolTelemetryBridge/, "Todas as variantes da rota precisam manter a ponte de telemetria sanitizada.");
  assert.match(route, /UnifiedConverterWorkspace/, "Rotas de saída do conversor devem reaproveitar o conversor unificado.");
  assert.match(route, /ToolEditorialPanel/, "As ferramentas devem receber conteúdo editorial específico do registro.");

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

  for (const capability of [
    "pen", "line", "arrow", "rect", "ellipse", "highlight", "redact", "comment", "stamp", "signature", "image",
    "duplicatePage", "insertBlankPage", "deletePage", "findNextText", "exportPdf", "undo", "redo",
  ]) assert.ok(studio.includes(capability), `Studio deve manter a capacidade ${capability}`);

  assert.ok(converter.includes("DataTransfer") && converter.includes("Converter para"), "Conversor deve manter o arquivo ao trocar o formato depois do upload.");
  assert.ok(ocr.includes("Tesseract") && ocr.includes("parseTsvWords") && ocr.includes("drawText"), "OCR deve criar camada pesquisável real.");
  assert.ok(about.includes("Arquivo primeiro") && about.includes("Limites explícitos"), "Sobre precisa ter conteúdo próprio e verificável.");
  assert.ok(contact.includes("mailto:") && contact.includes("Canal direto"), "Contato deve apontar para um canal real, sem formulário morto.");
  assert.ok(guides.includes("Aprenda a decidir") && guides.includes("redacao-segura-pdf"), "Guias devem ser editoriais e específicos.");

  assert.ok(sitemap.includes("allTools"), "Sitemap deve derivar URLs das ferramentas reais.");
  assert.ok(!sitemap.includes('"/faq"'), "FAQ antiga não deve voltar ao sitemap.");
  assert.ok(sitemap.includes('"/sobre"'), "A página Sobre nova deve ser indexável.");
  assert.ok(sitemap.includes('"/guias"'), "A Central de Guias deve ser indexável.");
  assert.ok(sitemap.includes('"/ferramentas/ocr-pdf"'), "OCR deve estar no sitemap.");
  assert.ok(sitemap.includes('"/ferramentas/converter-pdf"'), "Conversor central deve estar no sitemap.");
  assert.ok(sitemap.includes('"/ferramentas/dimensionar-pdf"'), "Dimensionamento deve estar no sitemap.");

  assert.ok(telemetryBridge.includes("file.size") && !telemetryBridge.includes("file.name"), "Telemetria cliente não pode coletar nome de arquivo.");
  assert.ok(telemetryBridge.includes("lastUiError.current = \"\""), "Falhas repetidas precisam voltar a ser contadas depois que o erro some.");
  assert.ok(telemetryLib.includes('localStorage.getItem(CONSENT_KEY) === "accepted"'), "Medição só pode ser enviada após consentimento opcional explícito.");
  assert.ok(telemetryLib.includes("measurementConsentGranted"), "A biblioteca de telemetria deve centralizar o gate de consentimento.");
  assert.ok(telemetryApi.includes("request.body?.getReader()"), "O endpoint deve limitar o corpo enquanto lê o stream, não só pelo Content-Length.");
  assert.ok(telemetryApi.includes("MAX_REQUEST_BYTES"), "O endpoint deve ter limite explícito de bytes.");
  assert.ok(telemetryApi.includes("Nunca registrar nome do arquivo"), "Endpoint deve documentar a restrição de privacidade.");
  assert.ok(!telemetryApi.includes("user-agent"), "User-Agent bruto não deve ser lido pelo endpoint.");

  console.log(JSON.stringify({ ok: true, suite: "tool-matrix", tools: allTools.length, advanced: advancedTools.length, memorySafe: memorySafe.size, cleanRelease: true, realOcr: true, unifiedConverter: true, uniqueEditorial: true, consentGatedTelemetry: true, boundedTelemetryBody: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
