import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.LIMPDF_VISUAL_DIR || "/tmp/limpdf-visual";

const viewports = [
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];
const routes = [
  { name: "home", path: "/" },
  { name: "catalogo", path: "/ferramentas" },
  { name: "editor", path: "/ferramentas/editar-pdf" },
  { name: "compactar", path: "/ferramentas/compactar-pdf" },
];

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const issues: string[] = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on("pageerror", (error) => issues.push(`${viewport.name}:pageerror:${error.message}`));
      page.on("console", (message) => { if (message.type() === "error" && !/adsbygoogle|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) issues.push(`${viewport.name}:console:${message.text()}`); });
      for (const route of routes) {
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });
        assert.equal(response?.status(), 200, `${viewport.name}/${route.name}: HTTP ${response?.status()}`);
        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyWidth: document.body.getBoundingClientRect().width,
          viewport: window.innerWidth,
        }));
        if (dimensions.scrollWidth > dimensions.clientWidth + 2 || dimensions.bodyWidth > dimensions.viewport + 2) {
          issues.push(`${viewport.name}/${route.name}:overflow-horizontal:${JSON.stringify(dimensions)}`);
        }
        const main = page.locator("#conteudo");
        assert.ok(await main.isVisible(), `${viewport.name}/${route.name}: conteúdo principal invisível`);
        const box = await main.boundingBox();
        assert.ok(box && box.width > 250, `${viewport.name}/${route.name}: conteúdo principal colapsado`);
        await page.screenshot({ path: join(outDir, `${route.name}-${viewport.name}.png`), fullPage: true });
      }
      await context.close();
    }

    const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(`${baseUrl}/ferramentas/editar-pdf`, { waitUntil: "networkidle" });
    const loadingAnimation = await reducedPage.evaluate(() => getComputedStyle(document.querySelector(".editor-mode-loading") || document.body).animationName);
    assert.ok(loadingAnimation === "none" || loadingAnimation === "", "prefers-reduced-motion deve desativar animação de loading");
    await reducedContext.close();

    assert.deepEqual(issues, [], issues.join("\n"));
    console.log(JSON.stringify({ ok: true, suite: "visual-audit", screenshots: viewports.length * routes.length, outDir }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
