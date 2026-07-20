const base = process.argv[2] || "http://127.0.0.1:3000";
const routes = ["/", "/ferramentas", "/ferramentas/juntar-pdf", "/ferramentas/compactar-pdf", "/ferramentas/preencher-formulario-pdf", "/guias", "/guias/como-juntar-pdf-no-celular", "/faq", "/privacidade", "/cookies", "/seguranca", "/sitemap.xml", "/robots.txt", "/ads.txt", "/.well-known/security.txt"];
for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  if (response.status < 200 || response.status >= 400) throw new Error(`${route} returned ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error(`${route} returned empty content`);
}
console.log(JSON.stringify({ ok: true, suite: "routes", checked: routes.length, base }));
