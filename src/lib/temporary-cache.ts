const DATABASE_NAME = "lim-pdf-temporary-cache";
const STORE_NAME = "tool-sessions";
const DATABASE_VERSION = 1;
export const TEMPORARY_CACHE_TTL = 4 * 60 * 60 * 1000;
const MAX_CACHE_BYTES = 80 * 1024 * 1024;

type CachedFile = {
  name: string;
  type: string;
  lastModified: number;
  data: Blob;
};

type CachedSession = {
  key: string;
  savedAt: number;
  files: CachedFile[];
};

export type TemporaryCacheStatus = {
  sessionCount: number;
  fileCount: number;
  totalBytes: number;
  expiresAt: number | null;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir o cache local."));
  });
}

export async function saveTemporaryFiles(key: string, files: File[]) {
  if (!("indexedDB" in window)) return false;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (!files.length || total > MAX_CACHE_BYTES) return false;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const session: CachedSession = {
    key,
    savedAt: Date.now(),
    files: files.map((file) => ({
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      data: file,
    })),
  };
  store.put(session);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
  return true;
}

export async function loadTemporaryFiles(key: string): Promise<File[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).get(key);
  const session = await new Promise<CachedSession | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as CachedSession | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  if (!session) return [];
  if (Date.now() - session.savedAt > TEMPORARY_CACHE_TTL) {
    await clearTemporaryFiles(key);
    return [];
  }
  return session.files.map(
    (file) => new File([file.data], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    }),
  );
}

export async function clearTemporaryFiles(key: string) {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(key);
  await new Promise<void>((resolve) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}

export async function getTemporaryCacheStatus(): Promise<TemporaryCacheStatus> {
  if (!("indexedDB" in window)) {
    return { sessionCount: 0, fileCount: 0, totalBytes: 0, expiresAt: null };
  }
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).getAll();
  const sessions = await new Promise<CachedSession[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as CachedSession[]) ?? []);
    request.onerror = () => reject(request.error);
  });
  database.close();
  const now = Date.now();
  const validSessions = sessions.filter((session) => now - session.savedAt <= TEMPORARY_CACHE_TTL);
  const expiredSessions = sessions.filter((session) => now - session.savedAt > TEMPORARY_CACHE_TTL);
  await Promise.all(expiredSessions.map((session) => clearTemporaryFiles(session.key)));
  return validSessions.reduce<TemporaryCacheStatus>(
    (status, session) => {
      const sessionBytes = session.files.reduce((sum, file) => sum + file.data.size, 0);
      const sessionExpiresAt = session.savedAt + TEMPORARY_CACHE_TTL;
      return {
        sessionCount: status.sessionCount + 1,
        fileCount: status.fileCount + session.files.length,
        totalBytes: status.totalBytes + sessionBytes,
        expiresAt: status.expiresAt === null ? sessionExpiresAt : Math.min(status.expiresAt, sessionExpiresAt),
      };
    },
    { sessionCount: 0, fileCount: 0, totalBytes: 0, expiresAt: null },
  );
}

export async function clearAllTemporaryFiles() {
  if (!("indexedDB" in window)) return;
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
