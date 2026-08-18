import assert from "node:assert/strict";
import { chromium, type Page } from "playwright-core";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";

type ViewportCase = {
  name: string;
  width: number;
  height: number;
  searchSelector: string;
  hiddenSelector: string;
};

const viewports: ViewportCase[] = [
  {
    name: "desktop",
    width: 1440,
    height: 900,
    searchSelector: ".sidebar-search input[role=combobox]:visible",
    hiddenSelector: ".header-search-slot input[role=combobox]",
  },
  {
    name: "tablet",
    width: 768,
    height: 1024,
    searchSelector: ".header-search-slot input[role=combobox]:visible",
    hiddenSelector: ".sidebar-search input[role=combobox]",
  },
  {
    name: "mobile",
    width: 390,
    height: 844,
    searchSelector: ".header-search-slot input[role=combobox]:visible",
    hiddenSelector: ".sidebar-search input[role=combobox]",
  },
];

function escapedAttribute(value: string) {
  return `[id="${value.replaceAll('"', '\\"')}"]`;
}

async function assertUniqueSearchIds(page: Page, viewportName: string) {
  const snapshot = await page.locator('input[role="combobox"]').evaluateAll((inputs) => {
    const comboboxes = inputs.map((input) => ({
      id: input.id,
      controls: input.getAttribute("aria-controls"),
      label: input.getAttribute("aria-label"),
      labelledBy: input.getAttribute("aria-labelledby"),
    }));
    const listboxes = Array.from(document.querySelectorAll('[role="listbox"]')).map((listbox) => ({
      id: listbox.id,
      label: listbox.getAttribute("aria-label"),
    }));
    const options = Array.from(document.querySelectorAll('[role="option"]')).map((option) => ({
      id: option.id,
      selected: option.getAttribute("aria-selected"),
    }));
    return { comboboxes, listboxes, options };
  });

  assert.equal(snapshot.comboboxes.length, 2, `${viewportName}: devem existir exatamente dois comboboxes estruturais`);
  assert.equal(new Set(snapshot.comboboxes.map((item) => item.id)).size, 2, `${viewportName}: IDs dos comboboxes devem ser únicos`);
  assert.ok(snapshot.comboboxes.every((item) => item.id && item.controls), `${viewportName}: cada combobox precisa de id e aria-controls`);
  assert.ok(snapshot.comboboxes.every((item) => item.label || item.labelledBy), `${viewportName}: cada combobox precisa de nome acessível`);
  assert.equal(new Set(snapshot.listboxes.map((item) => item.id)).size, snapshot.listboxes.length, `${viewportName}: IDs dos listboxes devem ser únicos`);
  assert.equal(new Set(snapshot.options.map((item) => item.id)).size, snapshot.options.length, `${viewportName}: IDs das opções devem ser únicos`);
  assert.ok(snapshot.options.every((item) => item.id && (item.selected === "true" || item.selected === "false")), `${viewportName}: cada opção precisa de id e aria-selected booleano`);
}

async function assertComboboxContract(page: Page, viewport: ViewportCase) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("#conteudo").waitFor({ state: "visible", timeout: 30_000 });
  await assertUniqueSearchIds(page, viewport.name);

  const search = page.locator(viewport.searchSelector);
  await search.waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await search.getAttribute("role"), "combobox", `${viewport.name}: busca visível precisa de role combobox`);
  assert.equal(await search.getAttribute("aria-autocomplete"), "list", `${viewport.name}: busca deve declarar autocomplete list`);
  assert.equal(await search.getAttribute("aria-haspopup"), "listbox", `${viewport.name}: busca deve declarar popup listbox`);
  assert.equal(await search.getAttribute("aria-expanded"), "false", `${viewport.name}: dropdown deve começar fechado`);

  const inputId = await search.getAttribute("id");
  const resultsId = await search.getAttribute("aria-controls");
  assert.ok(inputId, `${viewport.name}: input precisa de id`);
  assert.ok(resultsId, `${viewport.name}: input precisa de aria-controls`);
  assert.equal(await page.locator(`label[for="${inputId}"]`).count(), 1, `${viewport.name}: input precisa de label associado`);
  assert.equal(await page.locator(viewport.hiddenSelector).count(), 1, `${viewport.name}: slot não ativo deve continuar presente para SSR consistente`);

  await search.focus();
  const label = page.locator(`label[for="${inputId}"]`);
  const focusStyle = await label.evaluate((element) => {
    const style = getComputedStyle(element);
    return { boxShadow: style.boxShadow, borderColor: style.borderColor };
  });
  assert.ok(focusStyle.boxShadow !== "none" || focusStyle.borderColor !== "rgb(225, 228, 233)", `${viewport.name}: foco visível ausente no combobox`);

  await search.fill("diminuir pdf");
  assert.equal(await search.getAttribute("aria-expanded"), "true", `${viewport.name}: preencher a busca deve abrir o dropdown`);
  const results = page.locator(escapedAttribute(resultsId as string));
  await results.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await results.getAttribute("role"), "listbox", `${viewport.name}: aria-controls deve apontar para um listbox`);
  assert.equal(await results.getAttribute("aria-label"), "Resultados da busca", `${viewport.name}: listbox precisa de nome acessível`);
  assert.ok((await results.getByRole("option").count()) > 0, `${viewport.name}: busca deve renderizar opções`);
  assert.ok((await results.getByText(/Compactar PDF/i).count()) > 0, `${viewport.name}: busca por intenção deve encontrar Compactar PDF`);
  assert.equal(await search.getAttribute("aria-controls"), resultsId, `${viewport.name}: aria-controls mudou durante a abertura`);

  await search.press("ArrowDown");
  const activeDescendant = await search.getAttribute("aria-activedescendant");
  assert.ok(activeDescendant, `${viewport.name}: ArrowDown deve definir aria-activedescendant`);
  assert.equal(await results.locator(escapedAttribute(activeDescendant as string)).getAttribute("role"), "option", `${viewport.name}: active descendant deve apontar para uma option`);
  assert.equal(await results.locator('[role="option"][aria-selected="true"]').count(), 1, `${viewport.name}: deve existir uma única opção selecionada`);

  await search.press("ArrowUp");
  assert.ok(await search.getAttribute("aria-activedescendant"), `${viewport.name}: ArrowUp deve preservar a navegação por opções`);
  await search.press("Escape");
  assert.equal(await search.getAttribute("aria-expanded"), "false", `${viewport.name}: Escape deve fechar o dropdown`);
  assert.equal(await page.locator(escapedAttribute(resultsId as string)).count(), 0, `${viewport.name}: listbox deve sair do DOM ao fechar`);

  await page.keyboard.press("Control+K");
  assert.equal(await page.evaluate(() => document.activeElement?.id), inputId, `${viewport.name}: Ctrl+K deve focar o combobox visível`);
  assert.equal(await search.getAttribute("aria-expanded"), "true", `${viewport.name}: Ctrl+K deve abrir a busca`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const failures: string[] = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
      const page = await context.newPage();
      page.on("pageerror", (error) => failures.push(`${viewport.name}:pageerror:${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error" && !/adsbygoogle|ERR_BLOCKED_BY_CLIENT/i.test(message.text())) {
          failures.push(`${viewport.name}:console:${message.text()}`);
        }
      });
      await assertComboboxContract(page, viewport);
      await context.close();
    }

    assert.deepEqual(failures, [], failures.join("\n"));
    console.log(JSON.stringify({ ok: true, suite: "search-accessibility", viewports: viewports.map((viewport) => viewport.name) }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
