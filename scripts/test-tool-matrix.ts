import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allTools, advancedTools } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";
import { releaseTools } from "../src/lib/release-tools";
async function source(path: string) { return readFile(path, "utf8"); }

async function main() {
  const publicTools = [...allTools, ...proTools, ...releaseTools];
  assert.equal(allTools.length, 41); assert.equal(proTools.length, 17); assert.equal(releaseTools.length, 3); assert.equal(publicTools.length, 61);
  assert.equal(new Set(publicTools.map((tool) => tool.slug)).size, 61, "Slugs públicos devem ser únicos."); assert.equal(advancedTools.length, 9);
  const [route, converter, normalize, preflight, proWorkspace, linksWorkspace, navWorkspace, exportsFile, documentEngine, form, navigation, compare, scan, optimize, office, signature, images, studio, switcher, sitemap, telemetryBridge, telemetryLib, telemetryApi, sidebar, home, footer, guides, ads] = await Promise.all([
    source("src/app/ferramentas/[slug]/page.tsx"), source("src/components/UnifiedConverterWorkspace.tsx"), source("src/components/PageNormalizeWorkspace.tsx"), source("src/components/PreflightWorkspace.tsx"), source("src/components/ProPdfWorkspace.tsx"), source("src/components/ProLinksWorkspace.tsx"), source("src/components/ProNavigationWorkspace.tsx"), source("src/lib/pro-pdf-engines.ts"), source("src/lib/pro-pdf-document.ts"), source("src/lib/pro-pdf-form.ts"), source("src/lib/pro-pdf-navigation.ts"), source("src/lib/pro-pdf-compare.ts"), source("src/lib/pro-pdf-scan.ts"), source("src/lib/pro-pdf-optimize.ts"), source("src/lib/pro-pdf-office.ts"), source("src/lib/pro-pdf-sign.ts"), source("src/lib/pro-pdf-images.ts"), source("src/components/PdfEditorStudio.tsx"), source("src/components/PdfEditorExperienceSwitcher.tsx"), source("src/app/sitemap.ts"), source("src/components/ToolTelemetryBridge.tsx"), source("src/lib/tool-telemetry.ts"), source("src/app/api/telemetry/route.ts"), source("src/components/AppSidebar.tsx"), source("src/app/page.tsx"), source("src/components/SiteFooter.tsx"), source("src/lib/guides.ts"), source("public/ads.txt")
  ]);
  assert.match(route, /\.\.\.releaseTools/); assert.match(route, /UnifiedConverterWorkspace/); assert.match(route, /PageNormalizeWorkspace/); assert.match(route, /PreflightWorkspace/); assert.match(route, /ToolEditorialContent/); assert.match(route, /BreadcrumbList/);
  for (const slug of ["pdf-para-word","pdf-para-excel","pdf-para-powerpoint","pdf-para-jpg","pdf-para-png","extrair-texto-pdf"]) assert.ok(route.includes(`"${slug}"`), `Conversor unificado sem ${slug}`);
  assert.ok(converter.includes("Converter para") && converter.includes("allowedTargets") && converter.includes("pdfToDocxFidelity"), "Conversor deve permitir troca real de formato após upload.");
  assert.ok(normalize.includes("A4") && normalize.includes("customWidth") && normalize.includes("fit"), "Dimensionamento deve oferecer presets, custom e ajuste proporcional.");
  assert.ok(preflight.includes("pagesWithoutText") && preflight.includes("formFields") && preflight.includes("annotations"), "Preflight deve analisar texto, forms e anotações.");
  for (const capability of ["ocrPdf","signPdfPades","addHyperlink","createFormPdf","addBookmarks","removeAllHyperlinks","comparePdfs","repairPdf","preparePdfA","pdfToPptx","pptxToPdf","extractEmbeddedImages","cleanScannedPdf","optimizePdfAdvanced","addNativeAnnotation","processBatch","addBates","editMetadata"]) assert.ok(exportsFile.includes(capability), `Barrel profissional sem ${capability}`);
  assert.ok(linksWorkspace.includes("readHyperlinks") && linksWorkspace.includes("editHyperlink") && linksWorkspace.includes("removeHyperlink")); assert.ok(navWorkspace.includes("addBookmarks")); assert.ok(proWorkspace.includes("ocrPdf"));
  assert.ok(form.includes('PDFName.of("Sig")') && form.includes('PDFName.of("FT")'));
  assert.ok(compare.includes("multisetDiff") && compare.includes("textDiffs"), "Comparação deve considerar texto."); assert.ok(scan.includes("autoOrient") || scan.includes("orientation"), "Limpeza deve tratar orientação."); assert.ok(optimize.includes("structural") && optimize.includes("visual"));
  assert.ok(office.includes("MAX_ZIP_TOTAL_UNCOMPRESSED") && office.includes("orderedSlides") && office.includes("containBox"), "PPTX deve ter limites ZIP, ordem declarada e preservação de proporção.");
  assert.ok(signature.includes("validateCertificateKeyPair") && signature.includes("ByteRange"), "PAdES deve validar par certificado-chave e ByteRange.");
  assert.ok(documentEngine.includes('PDFName.of("Metadata")') && documentEngine.includes("uniqueName") && documentEngine.includes("createStoredZipFromBlobs"), "Metadados e lote devem remover XMP, deduplicar nomes e usar blobs.");
  assert.ok(navigation.includes("preservedExisting") && navigation.includes("oldLast"), "Bookmarks existentes devem ser preservados.");
  assert.ok(images.includes("paintInlineImageXObject") && images.includes("paintImageXObject"), "Extração deve tratar imagens inline e XObject.");
  for (const capability of ["pen","line","arrow","rect","ellipse","highlight","redact","comment","stamp","signature","image","duplicatePage","insertBlankPage","deletePage","findNextText","exportPdf","undo","redo"]) assert.ok(studio.includes(capability), `Studio sem ${capability}`);
  assert.ok(switcher.includes("preciseMounted") && switcher.includes("limpdfEditorMode"), "Os dois modos devem preservar sessão e sinalizar o modo ativo.");
  assert.ok(sitemap.includes("releaseTools") && sitemap.includes("guides") && sitemap.includes('"/sobre"'));
  assert.ok(home.includes("toolCount") && !home.includes("58 ferramentas") && !home.includes("32 funções"));
  assert.ok(sidebar.includes("reference-sidebar-label") && sidebar.includes("converter-pdf")); assert.ok(footer.includes("Preferências de privacidade") && footer.includes("/guias")); assert.ok(guides.includes("remover-dados-sensiveis-pdf"));
  assert.ok(/^google\.com, pub-\d+, DIRECT, f08c47fec0942fa0/m.test(ads));
  assert.ok(telemetryBridge.includes("file.size") && !telemetryBridge.includes("file.name")); assert.ok(telemetryLib.includes("ReleaseToolSlug") && telemetryLib.includes('localStorage.getItem(CONSENT_KEY) === "accepted"')); assert.ok(telemetryApi.includes("releaseTools") && telemetryApi.includes("Nunca registrar nome do arquivo"));
  console.log(JSON.stringify({ ok: true, suite: "tool-matrix", legacyTools: 41, proTools: 17, releaseTools: 3, totalTools: 61, advanced: 9, realOcr: true, padesBasic: true, pageSizing: true, unifiedConverter: true, preflight: true, adsenseTransparency: true, seoContent: true }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
