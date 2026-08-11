import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString, StandardFonts, rgb } from "pdf-lib";
import { ownedArrayBuffer, safeBaseName } from "@/lib/pro-pdf-core";

const encoder = new TextEncoder();
const latin1 = new TextDecoder("latin1");

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length); let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function pemBytes(pem: string, label: string) {
  const match = pem.replace(/\r/g, "").match(new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`));
  if (!match) throw new Error(`Conteúdo ${label} inválido.`);
  const binary = atob(match[1].replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function derLength(length: number) {
  if (length < 0x80) return new Uint8Array([length]);
  const parts: number[] = []; let value = length;
  while (value) { parts.unshift(value & 0xff); value >>>= 8; }
  return new Uint8Array([0x80 | parts.length, ...parts]);
}
function der(tag: number, content: Uint8Array) { return concat([new Uint8Array([tag]), derLength(content.length), content]); }
function derSeq(...parts: Uint8Array[]) { return der(0x30, concat(parts)); }
function derSet(...parts: Uint8Array[]) { return der(0x31, concat(parts)); }
function derNull() { return new Uint8Array([0x05, 0]); }
function derOctet(bytes: Uint8Array) { return der(0x04, bytes); }
function derInteger(value: number) { const bytes: number[] = []; let current = value; do { bytes.unshift(current & 0xff); current >>>= 8; } while (current); if (bytes[0] & 0x80) bytes.unshift(0); return der(0x02, new Uint8Array(bytes)); }
function derOid(value: string) {
  const numbers = value.split(".").map(Number); const body: number[] = [numbers[0] * 40 + numbers[1]];
  for (const number of numbers.slice(2)) { const stack = [number & 0x7f]; let current = number >>> 7; while (current) { stack.unshift(0x80 | current & 0x7f); current >>>= 7; } body.push(...stack); }
  return der(0x06, new Uint8Array(body));
}
function derUtc(date: Date) {
  const value = `${String(date.getUTCFullYear() % 100).padStart(2, "0")}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`;
  return der(0x17, encoder.encode(value));
}
function compareBytes(a: Uint8Array, b: Uint8Array) { for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; }
function tlv(bytes: Uint8Array, offset: number) {
  const tag = bytes[offset]; let cursor = offset + 1; let length = bytes[cursor++];
  if (length & 0x80) { const count = length & 0x7f; length = 0; for (let i = 0; i < count; i += 1) length = length << 8 | bytes[cursor++]; }
  return { tag, start: offset, valueStart: cursor, end: cursor + length };
}
function issuerAndSerial(certificate: Uint8Array) {
  const outer = tlv(certificate, 0); if (outer.tag !== 0x30) throw new Error("Certificado X.509 inválido.");
  const tbs = tlv(certificate, outer.valueStart); if (tbs.tag !== 0x30) throw new Error("TBSCertificate inválido.");
  let cursor = tbs.valueStart; let current = tlv(certificate, cursor);
  if (current.tag === 0xa0) { cursor = current.end; current = tlv(certificate, cursor); }
  const serial = certificate.slice(current.start, current.end); cursor = current.end;
  const signatureAlgorithm = tlv(certificate, cursor); cursor = signatureAlgorithm.end;
  const issuer = tlv(certificate, cursor);
  return { serial, issuer: certificate.slice(issuer.start, issuer.end) };
}
function algId(oid: string) { return derSeq(derOid(oid), derNull()); }
function attribute(oid: string, value: Uint8Array) { return derSeq(derOid(oid), derSet(value)); }

async function cmsDetached(content: Uint8Array, certificate: Uint8Array, privateKey: Uint8Array, signingTime: Date) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", ownedArrayBuffer(content)));
  const certificateDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", ownedArrayBuffer(certificate)));
  const attributes = [
    attribute("1.2.840.113549.1.9.3", derOid("1.2.840.113549.1.7.1")),
    attribute("1.2.840.113549.1.9.4", derOctet(digest)),
    attribute("1.2.840.113549.1.9.5", derUtc(signingTime)),
    attribute("1.2.840.113549.1.9.16.2.47", derSeq(derSeq(derOctet(certificateDigest)))),
  ].sort(compareBytes);
  const signedAttributesSet = derSet(...attributes);
  const key = await crypto.subtle.importKey("pkcs8", ownedArrayBuffer(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]).catch(() => { throw new Error("A chave precisa estar em RSA PKCS#8 PEM (BEGIN PRIVATE KEY)."); });
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, ownedArrayBuffer(signedAttributesSet)));
  const { issuer, serial } = issuerAndSerial(certificate);
  const signedAttributesContent = signedAttributesSet.slice(tlv(signedAttributesSet, 0).valueStart);
  const signerInfo = derSeq(derInteger(1), derSeq(issuer, serial), algId("2.16.840.1.101.3.4.2.1"), der(0xa0, signedAttributesContent), algId("1.2.840.113549.1.1.1"), derOctet(signature));
  const signedData = derSeq(derInteger(1), derSet(algId("2.16.840.1.101.3.4.2.1")), derSeq(derOid("1.2.840.113549.1.7.1")), der(0xa0, certificate), derSet(signerInfo));
  return derSeq(derOid("1.2.840.113549.1.7.2"), der(0xa0, signedData));
}

function writeAscii(target: Uint8Array, offset: number, value: string) { for (let index = 0; index < value.length; index += 1) target[offset + index] = value.charCodeAt(index); }
function bytesHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase(); }

export async function signPdfPades(file: File, certificatePem: string, privateKeyPem: string, options: { name: string; reason: string; visible: boolean }) {
  const certificate = pemBytes(certificatePem, "CERTIFICATE");
  const privateKey = pemBytes(privateKeyPem, "PRIVATE KEY");
  const reserveBytes = 32768;
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  const firstPage = pdf.getPages()[0];
  if (!firstPage) throw new Error("PDF sem páginas.");
  const signingTime = new Date();
  if (options.visible) {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const label = `Assinado digitalmente${options.name.trim() ? ` por ${options.name.trim()}` : ""}`;
    firstPage.drawRectangle({ x: 28, y: 28, width: 260, height: 40, borderWidth: .8, borderColor: rgb(.2, .55, .35), color: rgb(.95, 1, .97) });
    firstPage.drawText(label.slice(0, 62), { x: 38, y: 49, size: 9, font, color: rgb(.08, .35, .2) });
    firstPage.drawText(signingTime.toLocaleString("pt-BR"), { x: 38, y: 35, size: 7, font, color: rgb(.3, .4, .34) });
  }
  const ctx = pdf.context;
  const signature = ctx.obj({
    Type: "Sig", Filter: "Adobe.PPKLite", SubFilter: "ETSI.CAdES.detached",
    ByteRange: [0, 1111111111, 2222222222, 3333333333],
    Contents: PDFHexString.of("0".repeat(reserveBytes * 2)),
    Reason: PDFHexString.fromText(options.reason || "Assinatura digital"),
    Name: PDFHexString.fromText(options.name || "Assinante"), M: PDFString.fromDate(signingTime),
  }) as PDFDict;
  const signatureRef = ctx.register(signature);
  const widget = ctx.obj({ Type: "Annot", Subtype: "Widget", FT: "Sig", Rect: [0, 0, 0, 0], V: signatureRef, T: PDFHexString.fromText("LIMPDFSignature1"), F: 4, P: firstPage.ref }) as PDFDict;
  const widgetRef = ctx.register(widget); firstPage.node.addAnnot(widgetRef);
  const acroName = PDFName.of("AcroForm"); let acro = pdf.catalog.lookupMaybe(acroName, PDFDict);
  if (!acro) { acro = ctx.obj({ Fields: [], SigFlags: 3 }) as PDFDict; pdf.catalog.set(acroName, ctx.register(acro)); }
  let fields = acro.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (!fields) { fields = PDFArray.withContext(ctx); acro.set(PDFName.of("Fields"), fields); }
  fields.push(widgetRef); acro.set(PDFName.of("SigFlags"), PDFNumber.of(3));

  const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false });
  const text = latin1.decode(bytes); const marker = `<${"0".repeat(reserveBytes * 2)}>`; const contentsStart = text.indexOf(marker);
  if (contentsStart < 0) throw new Error("Não foi possível reservar o contêiner da assinatura.");
  const contentsEnd = contentsStart + marker.length;
  const placeholders = ["1111111111", "2222222222", "3333333333"];
  const values = [contentsStart, contentsEnd, bytes.length - contentsEnd];
  placeholders.forEach((placeholder, index) => {
    const offset = text.indexOf(placeholder); if (offset < 0) throw new Error("ByteRange não localizado.");
    const replacement = String(values[index]).padStart(placeholder.length, " ");
    if (replacement.length > placeholder.length) throw new Error("PDF grande demais para o ByteRange reservado.");
    writeAscii(bytes, offset, replacement);
  });
  const signedContent = concat([bytes.slice(0, contentsStart), bytes.slice(contentsEnd)]);
  const cms = await cmsDetached(signedContent, certificate, privateKey, signingTime);
  if (cms.length > reserveBytes) throw new Error("A assinatura criptográfica excedeu o espaço reservado.");
  writeAscii(bytes, contentsStart + 1, bytesHex(cms).padEnd(reserveBytes * 2, "0"));
  return { bytes, filename: `${safeBaseName(file)}-assinado-digitalmente.pdf` };
}
