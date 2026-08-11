const base = process.argv[2] || "http://127.0.0.1:3000";
const routes = [
  "/",
  "/ferramentas",
  "/ferramentas/editar-pdf",
  "/ferramentas/juntar-pdf",
  "/ferramentas/compactar-pdf",
  "/ferramentas/preencher-formulario-pdf",
  "/ferramentas/ocr-pdf",
  "/ferramentas/assinatura-digital-pdf",
  "/ferramentas/criar-formulario-pdf",
  "/ferramentas/links-pdf",
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
  "/categorias/converter",
  "/categorias/formularios",
  "/categorias/seguranca",
  "/privacidade",
  "/cookies",
  "/termos",
  "/contato",
  "/seguranca",
  "/acessibilidade",
  "/sitemap.xml",
  "/robots.txt",
  "/ads.txt",
  "/.well-known/security.txt",
];

for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  if (response.status < 200 || response.status >= 400) throw new Error(`${route} returned ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error(`${route} returned empty content`);
  if (route === "/ferramentas" && (!text.includes("Todas as ferramentas") || !text.includes("OCR PDF"))) throw new Error("catalog missing professional tool heading/content");
  if (route === "/ferramentas/editar-pdf") {
    for (const marker of ["Studio", "Modo preciso", "Arquivo", "Ajustes", "Resultado", "application/ld+json"]) {
      if (!text.includes(marker)) throw new Error(`editor route missing ${marker}`);
    }
  }
  if (route === "/ferramentas/compactar-pdf" && !text.includes("Fluxo guiado")) throw new Error("premium guided flow missing from standard tool");
  if (route === "/ferramentas/ocr-pdf" && (!text.includes("OCR PDF") || !text.includes("Idiomas do reconhecimento"))) throw new Error("OCR route missing real workspace markers");
  if (route === "/ferramentas/assinatura-digital-pdf" && !text.includes("Assinatura digital PDF")) throw new Error("digital signature route missing");
  if (route === "/sitemap.xml") {
    if (/<loc>[^<]*\/(faq|sobre)<\/loc>/.test(text)) throw new Error("sitemap still exposes removed legacy routes");
    if (!text.includes("/ferramentas/ocr-pdf") || !text.includes("/ferramentas/assinatura-digital-pdf")) throw new Error("sitemap missing professional tool routes");
  }
}

for (const route of ["/faq", "/sobre", "/api/colorcopia-guia"]) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  if (response.status !== 404) throw new Error(`${route} should return 404, got ${response.status}`);
}

const metricPayload = JSON.stringify({ v: 1, event: "process_success", tool: "compactar-pdf", browser: "chrome", sampleRate: 0.000001, inputSizeBucket: "2mb_10mb", outputSizeBucket: "512kb_2mb", durationBucket: "500ms_2s" });
const metric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: metricPayload });
if (metric.status !== 204) throw new Error(`telemetry valid payload returned ${metric.status}`);
const proMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ v: 1, event: "tool_view", tool: "ocr-pdf", browser: "chrome", sampleRate: 0.2 }) });
if (proMetric.status !== 204) throw new Error(`professional telemetry payload returned ${proMetric.status}`);
const invalidMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ v: 1, event: "upload_document", tool: "compactar-pdf", browser: "chrome" }) });
if (invalidMetric.status !== 400) throw new Error(`telemetry invalid payload returned ${invalidMetric.status}`);
const foreignOriginMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json", origin: "https://example.invalid" }, body: metricPayload });
if (foreignOriginMetric.status !== 403) throw new Error(`telemetry foreign origin returned ${foreignOriginMetric.status}`);
const oversizedMetric = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ v: 1, event: "tool_view", tool: "compactar-pdf", browser: "chrome", padding: "x".repeat(5000) }) });
if (oversizedMetric.status !== 413) throw new Error(`telemetry oversized payload returned ${oversizedMetric.status}`);
const wrongContentType = await fetch(`${base}/api/telemetry`, { method: "POST", headers: { "content-type": "text/plain" }, body: metricPayload });
if (wrongContentType.status !== 415) throw new Error(`telemetry wrong content-type returned ${wrongContentType.status}`);

console.log(JSON.stringify({ ok: true, suite: "routes", checked: routes.length, removed: 3, telemetry: true, professionalTelemetry: true, telemetryBodyLimit: true, base, premiumEditor: true, proSuite: true }));
