import assert from "node:assert/strict";
import { chromium, type BrowserContext, type Page } from "playwright-core";

const baseUrl = process.env.LIMPDF_BASE_URL || "http://127.0.0.1:3000";

async function prepareContext(context: BrowserContext, consent?: "essential" | "accepted") {
  await context.addInitScript(({ value }) => {
    Math.random = () => 0;
    if (value) localStorage.setItem("limpdf-consent-v1", value);
    else localStorage.removeItem("limpdf-consent-v1");
  }, { value: consent });
}

function observeTelemetry(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/telemetry") requests.push(request.method());
  });
  return requests;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const essentialContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await prepareContext(essentialContext, "essential");
    const essentialPage = await essentialContext.newPage();
    const essentialRequests = observeTelemetry(essentialPage);
    await essentialPage.goto(`${baseUrl}/ferramentas/compactar-pdf`, { waitUntil: "networkidle" });
    await essentialPage.waitForTimeout(350);
    assert.equal(essentialRequests.length, 0, "Somente essenciais não pode enviar medição.");
    await essentialContext.close();

    const missingContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await prepareContext(missingContext);
    const missingPage = await missingContext.newPage();
    const missingRequests = observeTelemetry(missingPage);
    await missingPage.goto(`${baseUrl}/ferramentas/compactar-pdf`, { waitUntil: "networkidle" });
    await missingPage.waitForTimeout(250);
    assert.equal(missingRequests.length, 0, "Antes da escolha de privacidade nenhuma medição pode ser enviada.");
    await missingPage.getByRole("button", { name: "Aceitar", exact: true }).click();
    await missingPage.waitForFunction(() => localStorage.getItem("limpdf-consent-v1") === "accepted");
    await missingPage.waitForTimeout(500);
    assert.ok(missingRequests.length >= 1, "Após consentimento opcional explícito a medição pode iniciar.");
    await missingContext.close();

    console.log(JSON.stringify({ ok: true, suite: "telemetry-consent", essentialRequests: 0, beforeConsentRequests: 0, afterConsentRequests: missingRequests.length }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
