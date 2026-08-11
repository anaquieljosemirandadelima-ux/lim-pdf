const base = process.argv[2] || "http://127.0.0.1:3000";
const routes = [
  "/",
  "/ferramentas",
  "/ferramentas/editar-pdf",
  "/ferramentas/juntar-pdf",
  "/ferramentas/compactar-pdf",
  "/ferramentas/preencher-formulario-pdf",
  "/faq",
  "/privacidade",
  "/cookies",
  "/seguranca",
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
    for (const marker of ["Studio", "Modo preciso", "Arquivo", "Ajustes", "Resultado"]) {
      if (!text.includes(marker)) throw new Error(`editor route missing ${marker}`);
    }
  }
  if (route === "/ferramentas/compactar-pdf" && !text.includes("Fluxo guiado")) throw new Error("premium guided flow missing from standard tool");
}

console.log(JSON.stringify({ ok: true, suite: "routes", checked: routes.length, base, premiumEditor: true }));
