import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";
const fixture = process.env.LIMPDF_QA_DIR ? `${process.env.LIMPDF_QA_DIR}/basic.pdf` : "/tmp/limpdf-qa/basic.pdf";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem("limpdf-consent-v1", "essential"));
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const response = await page.goto(`${baseUrl}/ferramentas/editar-pdf`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200);
    const studio = page.locator('[data-editor-mode="studio"]');
    await studio.locator('input[type="file"]').first().setInputFiles(fixture);
    await page.locator(".studio-shell").waitFor({ state: "visible", timeout: 30_000 });
    await page.getByRole("button", { name: /Studio Pro/ }).click();
    assert.ok(await page.locator(".studio-pro-panel").isVisible(), "Dock Studio Pro deve abrir");

    const pageCanvas = page.locator(".studio-canvas-stage:visible,.studio-canvas-area:visible,.studio-page-wrap:visible,.studio-page:visible").last();
    const box = await pageCanvas.boundingBox();
    assert.ok(box && box.width > 200 && box.height > 200, "Canvas do Studio deve estar visível");

    const textTool = page.getByRole("button", { name: /^Texto$/ }).first();
    if (await textTool.count()) {
      await textTool.click();
      await page.mouse.click(box!.x + box!.width * .35, box!.y + box!.height * .32);
      await page.mouse.click(box!.x + box!.width * .58, box!.y + box!.height * .48);
    } else {
      const rectTool = page.getByRole("button", { name: /Retângulo/ }).first();
      await rectTool.click();
      await page.mouse.move(box!.x + 120, box!.y + 140); await page.mouse.down(); await page.mouse.move(box!.x + 220, box!.y + 210); await page.mouse.up();
      await page.mouse.move(box!.x + 300, box!.y + 260); await page.mouse.down(); await page.mouse.move(box!.x + 390, box!.y + 330); await page.mouse.up();
    }

    const objects = page.locator('[data-editor-mode="studio"] [data-studio-object-id]');
    await page.waitForFunction(() => document.querySelectorAll('[data-editor-mode="studio"] [data-studio-object-id]').length >= 2, undefined, { timeout: 15_000 });
    const countBefore = await objects.count();
    const first = objects.nth(0); const second = objects.nth(1);
    await first.click(); await second.click({ modifiers: ["Shift"] });
    const groupButton = page.getByRole("button", { name: /Agrupar/ }).first();
    await groupButton.click();
    await page.waitForFunction(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-mode="studio"] [data-studio-object-id]')).slice(0, 2);
      return nodes.length === 2 && Boolean(nodes[0].dataset.studioGroupId) && nodes[0].dataset.studioGroupId === nodes[1].dataset.studioGroupId;
    });

    const beforeSecond = await second.boundingBox(); const beforeFirst = await first.boundingBox();
    if (beforeSecond && beforeFirst) {
      await page.mouse.move(beforeFirst.x + beforeFirst.width / 2, beforeFirst.y + beforeFirst.height / 2);
      await page.mouse.down(); await page.mouse.move(beforeFirst.x + beforeFirst.width / 2 + 24, beforeFirst.y + beforeFirst.height / 2 + 18, { steps: 4 }); await page.mouse.up();
      await page.waitForTimeout(250);
      const afterSecond = await second.boundingBox();
      assert.ok(afterSecond && Math.abs(afterSecond.x - beforeSecond.x) > 5, "Mover um membro deve mover o grupo");
    }

    await page.getByRole("button", { name: /Réguas/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('.studio-pro-ruler-x,.studio-pro-ruler-y').length >= 2);
    const guideSection = page.locator(".studio-pro-field").filter({ hasText: "Guia manual" });
    await guideSection.getByRole("button", { name: "Adicionar" }).click();
    await page.waitForFunction(() => document.querySelectorAll('.studio-pro-guide').length >= 1);

    await page.getByRole("button", { name: /Duplicar/ }).first().click();
    await page.waitForFunction((previous) => document.querySelectorAll('[data-editor-mode="studio"] [data-studio-object-id]').length > Number(previous), countBefore);

    const styleSection = page.locator(".studio-pro-field").filter({ hasText: "Estilo reutilizável" });
    await styleSection.locator("input").fill("QA Studio");
    await styleSection.getByRole("button", { name: /Salvar/ }).click();
    assert.ok(await page.evaluate(() => Boolean(localStorage.getItem("limpdf:studio-style:qa studio"))), "Estilo reutilizável deve ser persistido localmente");

    await page.getByRole("button", { name: /Modo preciso/ }).click();
    const precise = page.locator('[data-editor-mode="precise"]');
    await precise.locator('input[type="file"]').first().setInputFiles(fixture);
    await precise.getByRole("button", { name: /Adicionar texto/ }).waitFor({ state: "visible", timeout: 30_000 });
    await precise.getByRole("button", { name: /Adicionar texto/ }).click();
    await page.waitForTimeout(150);
    const preciseTextBefore = await precise.textContent();
    assert.ok(preciseTextBefore?.includes("Novo texto"), "Modo preciso deve conter a nova camada antes da troca");

    await page.getByRole("button", { name: /^Studio/ }).first().click();
    assert.equal(await precise.getAttribute("hidden"), "", "Modo preciso deve permanecer montado e apenas oculto");
    await page.getByRole("button", { name: /Modo preciso/ }).click();
    const preciseTextAfter = await precise.textContent();
    assert.ok(preciseTextAfter?.includes("Novo texto"), "Sessão do Modo preciso deve sobreviver à troca de modo");

    assert.deepEqual(errors, [], errors.join(" | "));
    console.log(JSON.stringify({ ok: true, suite: "studio-pro-browser", grouping: true, groupMove: true, rulers: true, guides: true, duplicate: true, reusableStyles: true, preciseSessionPreserved: true }));
  } finally {
    await context.close(); await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
