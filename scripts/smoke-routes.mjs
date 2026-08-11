const base = process.argv[2] || "http://127.0.0.1:3000";
const routes = [
  "/",
  "/ferramentas",
  "/ferramentas/editar-pdf",
  "/ferramentas/juntar-pdf",
  "/ferramentas/compactar-pdf",
  "/ferramentas/preencher-formulario-pdf",
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
  if (route === "/ferramentas" && !text.includes("Todas as ferramentas")) throw new Error("catalog missing tool heading");
  if (route === "/ferramentas/editar-pdf") {
    for (const marker of ["Studio", "Modo preciso", "Arquivo", "Ajustes", "Resultado", "application/ld+json"]) {
      if (!text.includes(marker)) throw new Error(`editor route missing ${marker}`);
    }
  }
  if (route === "/ferramentas/compactar-pdf" && !text.includes("Fluxo guiado")) throw new Error("premium guided flow missing from standard tool");
  if (route === "/sitemap.xml") {
    const legacyUrls = [`<loc>${base}/faq</loc>`, `<loc>${base}/sobre</loc>`];
    if (legacyUrls.some((url) => text.includes(url))) throw new Error("sitemap still exposes removed legacy routes");
  }
}

for (const route of ["/faq", "/sobre", "/api/colorcopia-guia"]) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  if (response.status !== 404) throw new Error(`${route} should return 404, got ${response.status}`);
}

const metricPayload = JSON.stringify({ v: 1, event: "process_success", tool: "compactar-pdf", browser: "chrome", sampleRate: 1, inputSizeBucket: "2mb_10mb", outputSizeBucket: "512kb_2mb", durationBucket: "500ms_2s" });
const metric = await fetch(`${base}/api/telemetry`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: metricPayload,
});
if (metric.status !== 204) throw new Error(`telemetry valid payload returned ${metric.status}`);
const invalidMetric = await fetch(`${base}/api/telemetry`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ v: 1, event: "upload_document", tool: "compactar-pdf", browser: "chrome" }),
});
if (invalidMetric.status !== 400) throw new Error(`telemetry invalid payload returned ${invalidMetric.status}`);
const foreignOriginMetric = await fetch(`${base}/api/telemetry`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://example.invalid" },
  body: metricPayload,
});
if (foreignOriginMetric.status !== 403) throw new Error(`telemetry foreign origin returned ${foreignOriginMetric.status}`);
const oversizedMetric = await fetch(`${base}/api/telemetry`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ v: 1, event: "tool_view", tool: "compactar-pdf", browser: "chrome", padding: "x".repeat(5000) }),
});
if (oversizedMetric.status !== 413) throw new Error(`telemetry oversized payload returned ${oversizedMetric.status}`);
const wrongContentType = await fetch(`${base}/api/telemetry`, {
  method: "POST",
  headers: { "content-type": "text/plain" },
  body: metricPayload,
});
if (wrongContentType.status !== 415) throw new Error(`telemetry wrong content-type returned ${wrongContentType.status}`);

console.log(JSON.stringify({ ok: true, suite: "routes", checked: routes.length, removed: 3, telemetry: true, telemetryBodyLimit: true, base, premiumEditor: true }));
