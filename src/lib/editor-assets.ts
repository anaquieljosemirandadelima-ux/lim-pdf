import { TEMPORARY_CACHE_TTL } from "@/lib/temporary-cache";

const DATABASE_NAME = "lim-pdf-editor-assets";
const STORE_NAME = "draft-assets";
const DATABASE_VERSION = 1;
const MAX_ASSET_SESSION_BYTES = 40 * 1024 * 1024;

type StoredAsset = {
  objectId: string;
  name: string;
  type: string;
  lastModified: number;
  data: Blob;
};

type StoredAssetSession = {
  fileKey: string;
  savedAt: number;
  assets: StoredAsset[];
};

export type EditorImageAssetInput = {
  objectId: string;
  file: File;
};

export type EditorImageAsset = {
  objectId: string;
  file: File;
};

export type EditorImageAssetStatus = {
  sessionCount: number;
  assetCount: number;
  totalBytes: number;
  expiresAt: number | null;
};

function available() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function sessionBytes(session: StoredAssetSession) {
  return session.assets.reduce((sum, asset) => sum + asset.data.size, 0);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "fileKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir os recursos temporários do editor."));
    request.onblocked = () => reject(new Error("Os recursos temporários do editor estão bloqueados por outra aba."));
  });
}

async function readAll(database: IDBDatabase) {
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).getAll();
  return new Promise<StoredAssetSession[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as StoredAssetSession[]) || []);
    request.onerror = () => reject(request.error || new Error("Falha ao ler os recursos temporários do editor."));
  });
}

export async function saveEditorImageAssets(fileKey: string, assets: EditorImageAssetInput[]) {
  if (!available()) return false;
  const totalBytes = assets.reduce((sum, asset) => sum + asset.file.size, 0);
  if (totalBytes > MAX_ASSET_SESSION_BYTES) return false;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    if (!assets.length) {
      store.delete(fileKey);
    } else {
      const session: StoredAssetSession = {
        fileKey,
        savedAt: Date.now(),
        assets: assets.map(({ objectId, file }) => ({
          objectId,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
          data: file,
        })),
      };
      store.put(session);
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao salvar os recursos temporários do editor."));
      transaction.onabort = () => reject(transaction.error || new Error("O salvamento dos recursos do editor foi interrompido."));
    });
    return true;
  } finally {
    database.close();
  }
}

export async function loadEditorImageAssets(fileKey: string): Promise<EditorImageAsset[]> {
  if (!available()) return [];
  const database = await openDatabase();
  let expired = false;
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(fileKey);
    const session = await new Promise<StoredAssetSession | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredAssetSession | undefined);
      request.onerror = () => reject(request.error || new Error("Falha ao recuperar os recursos do editor."));
    });
    if (!session) return [];
    expired = Date.now() - session.savedAt > TEMPORARY_CACHE_TTL;
    if (expired) return [];
    return session.assets.map((asset) => ({
      objectId: asset.objectId,
      file: new File([asset.data], asset.name, { type: asset.type, lastModified: asset.lastModified }),
    }));
  } finally {
    database.close();
    if (expired) await clearEditorImageAssets(fileKey);
  }
}

export async function clearEditorImageAssets(fileKey: string) {
  if (!available()) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(fileKey);
  await new Promise<void>((resolve) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}

export async function cleanupExpiredEditorImageAssets(now = Date.now()) {
  if (!available()) return;
  const database = await openDatabase();
  try {
    const sessions = await readAll(database);
    const expired = sessions.filter((session) => now - session.savedAt > TEMPORARY_CACHE_TTL).map((session) => session.fileKey);
    if (!expired.length) return;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    expired.forEach((fileKey) => store.delete(fileKey));
    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  } finally {
    database.close();
  }
}

export async function getEditorImageAssetStatus(now = Date.now()): Promise<EditorImageAssetStatus> {
  if (!available()) return { sessionCount: 0, assetCount: 0, totalBytes: 0, expiresAt: null };
  await cleanupExpiredEditorImageAssets(now);
  const database = await openDatabase();
  try {
    const sessions = await readAll(database);
    return sessions.reduce<EditorImageAssetStatus>((status, session) => {
      const expiresAt = session.savedAt + TEMPORARY_CACHE_TTL;
      return {
        sessionCount: status.sessionCount + 1,
        assetCount: status.assetCount + session.assets.length,
        totalBytes: status.totalBytes + sessionBytes(session),
        expiresAt: status.expiresAt === null ? expiresAt : Math.min(status.expiresAt, expiresAt),
      };
    }, { sessionCount: 0, assetCount: 0, totalBytes: 0, expiresAt: null });
  } finally {
    database.close();
  }
}

export async function clearAllEditorImageAssets() {
  if (!available()) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).clear();
  await new Promise<void>((resolve) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}
