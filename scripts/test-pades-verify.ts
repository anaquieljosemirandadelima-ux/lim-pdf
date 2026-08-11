import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { signPdfPades } from "../src/lib/pro-pdf-engines";

function derTotalLength(bytes: Uint8Array) {
  assert.equal(bytes[0], 0x30, "CMS deve começar com SEQUENCE DER");
  const first = bytes[1];
  if ((first & 0x80) === 0) return 2 + first;
  const count = first & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) length = (length << 8) | bytes[2 + index];
  return 2 + count + length;
}

async function fixture() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  page.drawText("LIM PDF PAdES VERIFY", { x: 72, y: 760, size: 18, font });
  return new File([await pdf.save({ useObjectStreams: false })], "pades.pdf", { type: "application/pdf" });
}

async function main() {
  const temp = mkdtempSync(join(tmpdir(), "limpdf-pades-verify-"));
  try {
    const key = join(temp, "key.pem");
    const cert = join(temp, "cert.pem");
    const pkcs8 = join(temp, "pkcs8.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", key, "-out", cert, "-sha256", "-days", "1", "-nodes", "-subj", "/CN=LIM PDF PAdES Verify"], { stdio: "ignore" });
    execFileSync("openssl", ["pkcs8", "-topk8", "-inform", "PEM", "-outform", "PEM", "-nocrypt", "-in", key, "-out", pkcs8], { stdio: "ignore" });

    const signed = await signPdfPades(await fixture(), readFileSync(cert, "utf8"), readFileSync(pkcs8, "utf8"), { name: "LIM PDF QA", reason: "Verificação criptográfica", visible: true });
    const text = new TextDecoder("latin1").decode(signed.bytes);
    const range = text.match(/\/ByteRange\s*\[\s*0\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    assert.ok(range, "ByteRange não encontrado");
    const firstLength = Number(range[1]);
    const secondStart = Number(range[2]);
    const secondLength = Number(range[3]);
    const signedContent = new Uint8Array(firstLength + secondLength);
    signedContent.set(signed.bytes.slice(0, firstLength), 0);
    signedContent.set(signed.bytes.slice(secondStart, secondStart + secondLength), firstLength);

    const contents = text.match(/\/Contents\s*<([0-9A-Fa-f]+)>/);
    assert.ok(contents, "Contents da assinatura não encontrado");
    const fullCms = Uint8Array.from(contents[1].match(/../g)!.map((hex) => Number.parseInt(hex, 16)));
    const cms = fullCms.slice(0, derTotalLength(fullCms));
    writeFileSync(join(temp, "content.bin"), signedContent);
    writeFileSync(join(temp, "signature.der"), cms);

    execFileSync("openssl", ["cms", "-verify", "-binary", "-inform", "DER", "-in", join(temp, "signature.der"), "-content", join(temp, "content.bin"), "-noverify", "-out", join(temp, "verified.bin")], { stdio: "ignore" });
    assert.ok(readFileSync(join(temp, "verified.bin")).length > 0, "OpenSSL não devolveu conteúdo verificado");
    console.log(JSON.stringify({ ok: true, suite: "pades-verify", cmsBytes: cms.length, signedBytes: signedContent.length, opensslVerified: true }));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
