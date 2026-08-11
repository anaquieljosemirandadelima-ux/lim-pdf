export function humanSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function announceDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() || "unknown" : "unknown";
  window.dispatchEvent(new CustomEvent("limpdf:download", { detail: { bytes: blob.size, extension } }));
}

export function downloadBlob(blob: Blob, filename: string) {
  announceDownload(blob, filename);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = "application/pdf") {
  const safeBytes = Uint8Array.from(bytes);
  downloadBlob(new Blob([safeBytes.buffer], { type }), filename);
}

export function outputName(file: File | undefined, suffix: string) {
  const base = file?.name.replace(/\.pdf$/i, "") || "lim-pdf";
  return `${base}-${suffix}.pdf`;
}

type ZipEntry = { name: string; data: Uint8Array };
export type BlobZipEntry = { name: string; data: Blob };

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function crc32Blob(blob: Blob) {
  const reader = blob.stream().getReader();
  let crc = 0xffffffff;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const byte of value) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  } finally {
    reader.releaseLock();
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function zipHeaders(name: Uint8Array, checksum: number, size: number, offset: number) {
  if (size > 0xffffffff || offset > 0xffffffff) throw new Error("O ZIP ultrapassa o limite do formato ZIP32.");
  const localHeader = new Uint8Array(30 + name.length);
  writeU32(localHeader, 0, 0x04034b50);
  writeU16(localHeader, 4, 20);
  writeU16(localHeader, 6, 0x0800);
  writeU16(localHeader, 8, 0);
  writeU16(localHeader, 10, 0);
  writeU16(localHeader, 12, 0);
  writeU32(localHeader, 14, checksum);
  writeU32(localHeader, 18, size);
  writeU32(localHeader, 22, size);
  writeU16(localHeader, 26, name.length);
  writeU16(localHeader, 28, 0);
  localHeader.set(name, 30);

  const central = new Uint8Array(46 + name.length);
  writeU32(central, 0, 0x02014b50);
  writeU16(central, 4, 20);
  writeU16(central, 6, 20);
  writeU16(central, 8, 0x0800);
  writeU16(central, 10, 0);
  writeU16(central, 12, 0);
  writeU16(central, 14, 0);
  writeU32(central, 16, checksum);
  writeU32(central, 20, size);
  writeU32(central, 24, size);
  writeU16(central, 28, name.length);
  writeU16(central, 30, 0);
  writeU16(central, 32, 0);
  writeU16(central, 34, 0);
  writeU16(central, 36, 0);
  writeU32(central, 38, 0);
  writeU32(central, 42, offset);
  central.set(name, 46);
  return { localHeader, central };
}

function zipEnd(entryCount: number, centralSize: number, centralOffset: number) {
  const end = new Uint8Array(22);
  writeU32(end, 0, 0x06054b50);
  writeU16(end, 4, 0);
  writeU16(end, 6, 0);
  writeU16(end, 8, entryCount);
  writeU16(end, 10, entryCount);
  writeU32(end, 12, centralSize);
  writeU32(end, 16, centralOffset);
  writeU16(end, 20, 0);
  return end;
}

export function createStoredZip(entries: ZipEntry[]) {
  if (entries.length > 0xffff) throw new Error("O ZIP ultrapassa o limite de 65.535 arquivos.");
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    if (name.length > 0xffff) throw new Error("Um nome de arquivo é longo demais para o ZIP.");
    const { localHeader, central } = zipHeaders(name, crc32(entry.data), entry.data.length, offset);
    localParts.push(Uint8Array.from(localHeader).buffer, Uint8Array.from(entry.data).buffer);
    centralParts.push(central);
    offset += localHeader.length + entry.data.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  return new Blob([...localParts, ...centralParts.map((part) => Uint8Array.from(part).buffer), Uint8Array.from(zipEnd(entries.length, centralSize, offset)).buffer], { type: "application/zip" });
}

export async function createStoredZipFromBlobs(entries: BlobZipEntry[]) {
  if (entries.length > 0xffff) throw new Error("O ZIP ultrapassa o limite de 65.535 arquivos.");
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    if (name.length > 0xffff) throw new Error("Um nome de arquivo é longo demais para o ZIP.");
    const checksum = await crc32Blob(entry.data);
    const { localHeader, central } = zipHeaders(name, checksum, entry.data.size, offset);
    localParts.push(Uint8Array.from(localHeader).buffer, entry.data);
    centralParts.push(central);
    offset += localHeader.length + entry.data.size;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  return new Blob([...localParts, ...centralParts.map((part) => Uint8Array.from(part).buffer), Uint8Array.from(zipEnd(entries.length, centralSize, offset)).buffer], { type: "application/zip" });
}
