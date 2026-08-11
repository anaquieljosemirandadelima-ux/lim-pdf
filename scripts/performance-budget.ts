import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { chromium } from "playwright-core";

const mode = process.argv[2] || "build";
const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";

async function files(root: string): Promise<{ path: string; size: number }[]> {
  const result: { path: string; size: number }[] = [];
  async function walk(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) result.push({ path, size: (await stat(path)).size });
    }
  }
  await walk(root);
  return result;
}

async function buildBudget() {
  const assets = await files(".next/static");
  const js = assets.filter((asset) => asset.path.endsWith(".js"));
  const css = assets.filter((asset) => asset.path.endsWith(".css"));
  const jsTotal = js.reduce((sum, asset) => sum + asset.size, 0);
  const cssTotal = css.reduce((sum, asset) => sum + asset.size, 0);
  const largestJs = js.reduce((largest, asset) => asset.size > largest.size ? asset : largest, { path: "", size: 0 });
  const largestCss = css.reduce((largest, asset) => asset.size > largest.size ? asset : largest, { path: "", size: 0 });

  assert.ok(jsTotal <= 24 * 1024 * 1024, `JS total acima de 24 MB: ${(jsTotal / 1024 / 1024).toFixed(2)} MB`);
  assert.ok(largestJs.size <= 5 * 1024 * 1024, `Chunk JS acima de 5 MB: ${relative(process.cwd(), largestJs.path)} ${(largestJs.size / 1024 / 1024).toFixed(2)} MB`);
  assert.ok(cssTotal <= 2 * 1024 * 1024, `CSS total acima de 2 MB: ${(cssTotal / 1024 / 1024).toFixed(2)} MB`);
  assert.ok(largestCss.size <= 900 * 1024, `CSS individual acima de 900 KB: ${relative(process.cwd(), largestCss.path)}`);
  console.log(JSON.stringify({
    ok: true,
    suite: "performance-build",
    jsTotalMb: Number((jsTotal / 1024 / 1024).toFixed(2)),
    cssTotalMb: Number((cssTotal / 1024 / 1024).toFixed(2)),
    largestJsKb: Math.round(largestJs.size / 1024),
    largestCssKb: Math.round(largestCss.size / 1024),
  }));
}

async function browserBudget() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const page = await context.newPage();
  const routes = ["/", "/ferramentas", "/ferramentas/editar-pdf", "/ferramentas/compactar-pdf"];
  const results = [];
  try {
    for (const route of routes) {
      const started = Date.now();
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const elapsed = Date.now() - started;
      assert.equal(response?.status(), 200, `${route}: HTTP ${response?.status()}`);
      const metrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        const jsCss = resources.filter((entry) => /\.(js|css)(\?|$)/.test(entry.name));
        return {
          resourceCount: resources.length,
          jsCssTransfer: jsCss.reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0),
          maxResource: resources.reduce((max, entry) => Math.max(max, entry.transferSize || entry.encodedBodySize || 0), 0),
        };
      });
      assert.ok(elapsed < 12_000, `${route}: carregamento local acima de 12s (${elapsed}ms)`);
      assert.ok(metrics.jsCssTransfer < 12 * 1024 * 1024, `${route}: JS/CSS transferidos acima de 12 MB`);
      assert.ok(metrics.maxResource < 6 * 1024 * 1024, `${route}: recurso individual acima de 6 MB`);
      results.push({ route, elapsed, jsCssKb: Math.round(metrics.jsCssTransfer / 1024), resources: metrics.resourceCount });
    }
    console.log(JSON.stringify({ ok: true, suite: "performance-browser", routes: results }));
  } finally {
    await context.close();
    await browser.close();
  }
}

(mode === "browser" ? browserBudget() : buildBudget()).catch((error) => { console.error(error); process.exitCode = 1; });
