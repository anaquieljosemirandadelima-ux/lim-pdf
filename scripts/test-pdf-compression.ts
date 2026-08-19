import assert from "node:assert/strict";
import { chooseSmallestPdf, compressionReduction, getPdfCompressionPreset, PDF_COMPRESSION_PRESETS } from "../src/lib/pdf-compression";

const input = new Uint8Array(1000);
const structural = new Uint8Array(700);
const visual = new Uint8Array(500);

assert.equal(getPdfCompressionPreset("alta"), "alta");
assert.equal(getPdfCompressionPreset("recomendada"), "recomendada");
assert.equal(getPdfCompressionPreset("forte"), "recomendada");
assert.equal(PDF_COMPRESSION_PRESETS.maxima.quality < PDF_COMPRESSION_PRESETS.recomendada.quality, true);
assert.equal(PDF_COMPRESSION_PRESETS.recomendada.scale < PDF_COMPRESSION_PRESETS.alta.scale, true);

const selected = chooseSmallestPdf(input, [
  { strategy: "estrutural", bytes: structural },
  { strategy: "visual", bytes: visual },
]);
assert.equal(selected.strategy, "visual");
assert.equal(selected.bytes.length, 500);
assert.equal(selected.reduction, 50);
assert.equal(compressionReduction(1000, 1200), 0);
assert.equal(chooseSmallestPdf(input, [{ strategy: "visual", bytes: new Uint8Array(1200) }]).strategy, "original");

console.log("PDF compression helpers: ok");
