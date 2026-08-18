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
      await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
      const page = await context.newPage();
      page.on("pageerror", (error) => issues.push(`${viewport.name}:pageerror:${error.message}`));
      page.on("console", (message) => { if (message.type() === "error" && !/adsbygoogle|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) issues.push(`${viewport.name}:console:${message.text()}`); });
      for (const route of routes) {
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        assert.equal(response?.status(), 200, `${viewport.name}/${route.name}: HTTP ${response?.status()}`);
        const main = page.locator("#conteudo");
        await main.waitFor({ state: "visible", timeout: 30_000 });
        await page.waitForTimeout(180);
        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyWidth: document.body.getBoundingClientRect().width,
          viewport: window.innerWidth,
        }));
        if (dimensions.scrollWidth > dimensions.clientWidth + 2 || dimensions.bodyWidth > dimensions.viewport + 2) {
          issues.push(`${viewport.name}/${route.name}:overflow-horizontal:${JSON.stringify(dimensions)}`);
        }
        const box = await main.boundingBox();
        assert.ok(box && box.width > 250, `${viewport.name}/${route.name}: conteúdo principal colapsado`);
        if (route.path.startsWith("/ferramentas/")) {
          for (const required of ["Sobre a ferramenta", "Dúvidas desta função", "Abrir guias práticos"]) {
            assert.ok(await page.getByText(required, { exact: true }).count() > 0, `${viewport.name}/${route.name}: painel editorial sem ${required}`);
          }
        }
        await page.screenshot({ path: join(outDir, `${route.name}-${viewport.name}.png`), fullPage: true });
      }
      await context.close();
    }

    const uxContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const uxPage = await uxContext.newPage();
    await uxPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const consent = uxPage.locator(".consent-toast");
    await consent.waitFor({ state: "visible", timeout: 30_000 });
    const consentBox = await consent.boundingBox();
    assert.ok(consentBox && consentBox.width <= 540 && consentBox.height < 330, `Cookie popup grande demais: ${JSON.stringify(consentBox)}`);
    await uxPage.screenshot({ path: join(outDir, "cookies-desktop-1440.png"), fullPage: true });
    await uxPage.getByRole("button", { name: "Só essenciais" }).click();
    const search = uxPage.getByRole("combobox");
    await search.fill("diminuir pdf");
    const searchResults = uxPage.locator(".global-search-results");
    await searchResults.waitFor({ state: "visible", timeout: 10_000 });
    assert.ok((await searchResults.getByText(/Compactar PDF/i).count()) > 0, "Busca por intenção 'diminuir pdf' deve encontrar Compactar PDF.");
    await uxPage.waitForTimeout(240);
    await uxPage.screenshot({ path: join(outDir, "busca-desktop-1440.png"), fullPage: true });

    await uxPage.goto(`${baseUrl}/ferramentas`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const catalogSearch = uxPage.getByRole("textbox", { name: "Buscar no catálogo de ferramentas" });
    await catalogSearch.fill("centro");
    const catalogSummary = uxPage.locator(".catalog-results-summary");
    await catalogSummary.waitFor({ state: "visible", timeout: 10_000 });
    assert.match(await catalogSummary.innerText(), /1 ferramenta.*centro/i, "Busca local deve mostrar contagem e termo pesquisado.");
    assert.equal(await uxPage.getByRole("link", { name: /Centro de impressão/i }).count(), 1, "Busca local deve encontrar exatamente Centro de impressão.");
    await uxPage.getByRole("button", { name: "Limpar filtros" }).click();
    assert.match(await catalogSummary.innerText(), /62 ferramentas.*Todas/i, "Limpar filtros deve restaurar o inventário canónico completo.");

    const globalSearch = uxPage.locator(".sidebar-search #header-tool-search");
    assert.equal(await uxPage.locator(".sidebar-search #header-tool-search").count(), 1, "O buscador global deve permanecer na sidebar no desktop.");
    assert.equal(await uxPage.locator(".header-search-slot #header-tool-search").count(), 1, "O fallback do cabeçalho deve existir no DOM para viewports responsivos.");
    assert.equal(await uxPage.locator(".header-search-slot").evaluate((element) => getComputedStyle(element).display), "none", "O fallback do cabeçalho deve permanecer oculto no desktop.");
    await globalSearch.fill("zzzzxyz");
    const emptyResults = uxPage.getByRole("listbox");
    await emptyResults.waitFor({ state: "visible", timeout: 10_000 });
    assert.ok((await emptyResults.getByText("Nenhum resultado", { exact: true }).count()) > 0, "Busca global deve ter estado vazio explícito.");
    const desktopResultsBox = await emptyResults.boundingBox();
    assert.ok(desktopResultsBox && desktopResultsBox.x >= 0 && desktopResultsBox.x + desktopResultsBox.width <= 1442, `Dropdown desktop fora da janela: ${JSON.stringify(desktopResultsBox)}`);
    const desktopScrollbar = await emptyResults.evaluate((element) => ({
      overflowY: getComputedStyle(element).overflowY,
      scrollbarWidth: getComputedStyle(element).scrollbarWidth,
    }));
    assert.equal(desktopScrollbar.scrollbarWidth, "none", `Dropdown desktop não pode exibir scrollbar nativa: ${JSON.stringify(desktopScrollbar)}`);
    await globalSearch.press("Escape");
    assert.equal(await emptyResults.count(), 0, "Escape deve fechar o dropdown global.");
    await uxContext.close();

    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      const responsiveContext = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      await responsiveContext.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
      const responsivePage = await responsiveContext.newPage();
      await responsivePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const responsiveSearch = responsivePage.locator(".header-search-slot #header-tool-search");
      await responsiveSearch.waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(await responsivePage.locator(".sidebar-search #header-tool-search").count(), 1, "A sidebar deve manter um único componente estrutural de busca.");
      assert.equal(await responsivePage.locator(".sidebar-search").evaluate((element) => getComputedStyle(element).display), "none", `Sidebar deve ficar oculta em ${viewport.width}px.`);
      await responsiveSearch.fill("diminuir pdf");
      const responsiveResults = responsivePage.getByRole("listbox");
      await responsiveResults.waitFor({ state: "visible", timeout: 10_000 });
      assert.ok((await responsiveResults.getByText(/Compactar PDF/i).count()) > 0, `Busca responsiva deve encontrar Compactar PDF em ${viewport.width}px.`);
      const responsiveResultsBox = await responsiveResults.boundingBox();
      assert.ok(responsiveResultsBox && responsiveResultsBox.x >= 0 && responsiveResultsBox.x + responsiveResultsBox.width <= viewport.width + 2, `Dropdown responsivo fora da janela em ${viewport.width}px: ${JSON.stringify(responsiveResultsBox)}`);
      const responsiveScrollbar = await responsiveResults.evaluate((element) => ({
        overflowY: getComputedStyle(element).overflowY,
        scrollbarWidth: getComputedStyle(element).scrollbarWidth,
      }));
      assert.equal(responsiveScrollbar.scrollbarWidth, "none", `Dropdown responsivo não pode exibir scrollbar nativa em ${viewport.width}px: ${JSON.stringify(responsiveScrollbar)}`);
      await responsiveContext.close();
    }

    const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await reducedContext.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(`${baseUrl}/ferramentas/editar-pdf`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await reducedPage.locator("#conteudo").waitFor({ state: "visible", timeout: 30_000 });
    const loadingAnimation = await reducedPage.evaluate(() => getComputedStyle(document.querySelector(".editor-mode-loading") || document.body).animationName);
    assert.ok(loadingAnimation === "none" || loadingAnimation === "", "prefers-reduced-motion deve desativar animação de loading");
    await reducedContext.close();

    assert.deepEqual(issues, [], issues.join("\n"));
    console.log(JSON.stringify({ ok: true, suite: "visual-audit", screenshots: viewports.length * routes.length + 2, outDir, cookiePopup: true, globalSearch: true, editorialPanel: true }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
