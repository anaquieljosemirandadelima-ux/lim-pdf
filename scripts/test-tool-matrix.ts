import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allTools, advancedTools, isAdvancedToolSlug } from "../src/lib/all-tools";

const memorySafe = new Set(["pdf-para-jpg", "pdf-para-png", "compactar-pdf", "pdf-em-escala-de-cinza"]);

async function source(path: string) {
  return readFile(path, "utf8");
}

async function main() {
  assert.equal(allTools.length, 41, "O catálogo deve manter 41 ferramentas reais.");
  assert.equal(new Set(allTools.map((tool) => tool.slug)).size, allTools.length, "Slugs devem ser únicos.");
  assert.equal(advancedTools.length, 9, "As nove ferramentas avançadas precisam permanecer registradas.");

  const [route, generic, sequential, advanced, studio, sitemap, telemetry, telemetryApi] = await Promise.all([
    source("src/app/ferramentas/[slug]/page.tsx"),
    source("src/components/PdfToolWorkspace.tsx"),
    source("src/components/MemorySafePdfWorkspace.tsx"),
    source("src/components/AdvancedToolWorkspace.tsx"),
    source("src/components/PdfEditorStudio.tsx"),
    source("src/app/sitemap.ts"),
    source("src/components/ToolTelemetryBridge.tsx"),
    source("src/app/api/telemetry/route.ts"),
  ]);

  assert.match(route, /generateStaticParams\(\).*allTools\.map/s, "A rota dinâmica deve gerar parâmetros a partir do registro das 41 ferramentas.");
  assert.match(route, /allToolBySlug\.get/, "A rota dinâmica deve resolver a ferramenta pelo registro central.");
  assert.match(route, /ToolTelemetryBridge/, "Todas as variantes da rota precisam manter a ponte de telemetria sanitizada.");

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

  assert.ok(sitemap.includes("allTools"), "Sitemap deve derivar URLs das ferramentas reais.");
  assert.ok(!sitemap.includes('"/faq"'), "FAQ antiga não deve voltar ao sitemap.");
  assert.ok(!sitemap.includes('"/sobre"'), "Sobre antigo não deve voltar ao sitemap.");
  assert.ok(telemetry.includes("file.size") && !telemetry.includes("file.name"), "Telemetria cliente não pode coletar nome de arquivo.");
  assert.ok(telemetryApi.includes("Nunca registrar nome do arquivo"), "Endpoint deve documentar a restrição de privacidade.");
  assert.ok(!telemetryApi.includes("user-agent"), "User-Agent bruto não deve ser lido pelo endpoint.");

  console.log(JSON.stringify({ ok: true, suite: "tool-matrix", tools: allTools.length, advanced: advancedTools.length, memorySafe: memorySafe.size }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
