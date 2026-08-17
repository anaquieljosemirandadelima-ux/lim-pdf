import assert from "node:assert/strict";
import { formatFileSizeLimit, getFileSizeGuidance, getFileSizeTier, isFileWithinLimit, MAX_LOCAL_PDF_BYTES } from "@/lib/file-validation";

function fakeFile(size: number, name = "documento.pdf") {
  return { size, name, type: "application/pdf" } as File;
}

assert.equal(MAX_LOCAL_PDF_BYTES, 500 * 1024 * 1024, "o limite premium deve ser de 500 MB");
assert.equal(formatFileSizeLimit(), "500 MB");
assert.equal(isFileWithinLimit(fakeFile(500 * 1024 * 1024)), true);
assert.equal(isFileWithinLimit(fakeFile(500 * 1024 * 1024 + 1)), false);
assert.equal(getFileSizeTier(fakeFile(99 * 1024 * 1024)), "standard");
assert.equal(getFileSizeTier(fakeFile(100 * 1024 * 1024)), "large");
assert.equal(getFileSizeTier(fakeFile(250 * 1024 * 1024)), "very-large");
assert.match(getFileSizeGuidance(fakeFile(120 * 1024 * 1024)).message, /mais tempo/i);
assert.match(getFileSizeGuidance(fakeFile(300 * 1024 * 1024)).message, /pressão de memória/i);

console.log("File validation tests passed: 500 MB limit and large-file guidance.");
