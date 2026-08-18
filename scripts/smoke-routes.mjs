const base = process.argv[2] || "http://127.0.0.1:3000";
const professionalRoutes = [
  "/ferramentas/assinatura-digital-pdf",
  "/ferramentas/links-pdf",
  "/ferramentas/criar-formulario-pdf",
  "/ferramentas/bookmarks-pdf",
  "/ferramentas/comparar-pdfs",
  "/ferramentas/reparar-pdf",
  "/ferramentas/pdf-a",
  "/ferramentas/pdf-para-powerpoint",
  "/ferramentas/powerpoint-para-pdf",
  "/ferramentas/extrair-imagens-pdf",
  "/ferramentas/limpar-documento-digitalizado",
  "/ferramentas/otimizar-pdf-avancado",
  "/ferramentas/anotacoes-pdf",
  "/ferramentas/processamento-lote-pdf",
  "/ferramentas/numeracao-bates",
  "/ferramentas/editar-metadados-pdf",
];
const routes = [
  "/", "/ferramentas", "/ferramentas/editar-pdf", "/ferramentas/converter-pdf", "/ferramentas/ocr-pdf", "/ferramentas/dimensionar-pdf", "/ferramentas/preflight-pdf", "/ferramentas/juntar-pdf", "/ferramentas/compactar-pdf", "/ferramentas/preencher-formulario-pdf",
  ...professionalRoutes,
  "/privacidade", "/cookies", "/termos", "/seguranca", "/acessibilidade", "/guias", "/guias/editar-pdf-sem-perder-formatacao", "/guias/ocr-pdf-escaneado", "/guias/comprimir-pdf", "/guias/redacao-segura-pdf", "/guias/juntar-pdf", "/guias/converter-pdf-para-word", "/guias/assinar-pdf-digitalmente", "/guias/proteger-pdf-com-senha", "/sobre", "/premium", "/contato", "/sitemap.xml", "/robots.txt", "/ads.txt", "/.well-known/security.txt",
];

for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  if (response.status < 200 || response.status >= 400) throw new Error(`${route} returned ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error(`${route} returned empty content`);
  if (route === "/ferramentas" && (!text.includes("Todas as ferramentas") || !text.includes("O LIM PDF é 100% gratuito") || !text.includes("Preflight PDF"))) throw new Error("catalog missing free-catalog priority content");
  if (route === "/ferramentas/editar-pdf") {
    for (const marker of ["Editar PDF", "Abrindo o editor", "application/ld+json"]) if (!text.includes(marker)) throw new Error(`editor route missing ${marker}`);
    for (const forbidden of ["Modo preciso", "Visual, rápido e direto", "Atalhos do editor"]) if (text.includes(forbidden)) throw new Error(`editor route still exposes old mode UI: ${forbidden}`);
  }
  if (route === "/ferramentas/converter-pdf" && (!text.includes("Converter para") || !text.includes("Word") || !text.includes("Excel"))) throw new Error("unified converter missing format controls");
  if (route === "/ferramentas/ocr-pdf" && (!text.includes("OCR PDF") || !text.includes("Idiomas do reconhecimento"))) throw new Error("OCR route missing workspace markers");
  if (route === "/ferramentas/preflight-pdf" && (!text.includes("Preflight PDF") || !text.includes("Executar preflight"))) throw new Error("preflight route missing diagnosis UI");
  if (professionalRoutes.includes(route) && !text.includes("pro-pdf-workspace")) throw new Error(`${route} missing professional workspace`);
  if (route === "/sitemap.xml") {
    for (const marker of ["/ferramentas/converter-pdf", "/ferramentas/ocr-pdf", "/ferramentas/dimensionar-pdf", "/ferramentas/preflight-pdf", "/ferramentas/assinatura-digital-pdf", "/ferramentas/links-pdf", "/ferramentas/comparar-pdfs"]) if (!text.includes(marker)) throw new Error(`sitemap missing ${marker}`);
    for (const required of ["/sobre", "/guias", "/premium", "/contato", "/guias/editar-pdf-sem-perder-formatacao", "/guias/ocr-pdf-escaneado"]) {
      const locSuffix = `${required}</loc>`;
      if (!text.includes(locSuffix)) throw new Error(`sitemap missing editorial route ${required}`);
    }
  }
}

for (const route of ["/faq", "/api/colorcopia-guia", "/api/contato"]) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  if (route === "/api/contato") {
    if (response.status !== 404 && response.status !== 405) throw new Error(`${route} should be removed, got ${response.status}`);
  } else if (response.status !== 404) throw new Error(`${route} should return 404, got ${response.status}`);
}

const metricPayload = JSON.stringify({ v: 1, event: "process_success", tool: "compactar-pdf", browser: "chrome", sampleRate: 1, inputSizeBucket: "2mb_10mb", outputSizeBucket: "512kb_2mb", durationBucket: "500ms_2s" });
const metric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: metricPayload });
if (metric.status !== 204) throw new Error(`telemetry valid payload returned ${metric.status}`);
const invalidMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ v: 1, event: "upload_document", tool: "compactar-pdf", browser: "chrome" }) });
if (invalidMetric.status !== 400) throw new Error(`telemetry invalid payload returned ${invalidMetric.status}`);
const foreignOriginMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json", origin: "https://example.invalid" }, body: metricPayload });
if (foreignOriginMetric.status !== 403) throw new Error(`telemetry foreign origin returned ${foreignOriginMetric.status}`);
const oversizedMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ v: 1, event: "tool_view", tool: "compactar-pdf", browser: "chrome", padding: "x".repeat(5000) }) });
if (oversizedMetric.status !== 413) throw new Error(`telemetry oversized payload returned ${oversizedMetric.status}`);
const wrongContentType = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "text/plain" }, body: metricPayload });
if (wrongContentType.status !== 415) throw new Error(`telemetry wrong content-type returned ${wrongContentType.status}`);

console.log(JSON.stringify({ ok: true, suite: "routes", checked: routes.length, professionalRoutes: professionalRoutes.length, removed: 3, editorialRoutes: true, telemetry: true, publicFlows: 61, unifiedEditor: true, seoFocused: true }));
