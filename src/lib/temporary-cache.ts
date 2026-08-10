const DATABASE_NAME = "lim-pdf-temporary-cache";
const STORE_NAME = "tool-sessions";
const DATABASE_VERSION = 1;
export const TEMPORARY_CACHE_TTL = 4 * 60 * 60 * 1000;
const MAX_SESSION_BYTES = 80 * 1024 * 1024;
const MAX_TOTAL_CACHE_BYTES = 160 * 1024 * 1024;

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

function sessionBytes(session: CachedSession) {
  return session.files.reduce((sum, file) => sum + file.data.size, 0);
}

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
    request.onblocked = () => reject(new Error("O cache local está bloqueado por outra aba."));
  });
}

async function readAllSessions(database: IDBDatabase) {
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).getAll();
  return new Promise<CachedSession[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as CachedSession[]) ?? []);
    request.onerror = () => reject(request.error || new Error("Falha ao ler o cache local."));
  });
}

export async function saveTemporaryFiles(key: string, files: File[]) {
  if (!("indexedDB" in window)) return false;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (!files.length || total > MAX_SESSION_BYTES) return false;

  const database = await openDatabase();
  try {
    const now = Date.now();
    const existing = await readAllSessions(database);
    const candidates = existing
      .filter((session) => session.key !== key && now - session.savedAt <= TEMPORARY_CACHE_TTL)
      .sort((a, b) => a.savedAt - b.savedAt);
    let retainedBytes = candidates.reduce((sum, session) => sum + sessionBytes(session), 0);
    const keysToDelete = existing
      .filter((session) => session.key === key || now - session.savedAt > TEMPORARY_CACHE_TTL)
      .map((session) => session.key);

    while (candidates.length && retainedBytes + total > MAX_TOTAL_CACHE_BYTES) {
      const oldest = candidates.shift();
      if (!oldest) break;
      retainedBytes -= sessionBytes(oldest);
      keysToDelete.push(oldest.key);
    }
    if (retainedBytes + total > MAX_TOTAL_CACHE_BYTES) return false;

    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    Array.from(new Set(keysToDelete)).forEach((storedKey) => store.delete(storedKey));
    const session: CachedSession = {
      key,
      savedAt: now,
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
      transaction.onerror = () => reject(transaction.error || new Error("Falha ao salvar o cache local."));
      transaction.onabort = () => reject(transaction.error || new Error("O cache local foi interrompido."));
    });
    return true;
  } finally {
    database.close();
  }
}

export async function loadTemporaryFiles(key: string): Promise<File[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    const session = await new Promise<CachedSession | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CachedSession | undefined);
      request.onerror = () => reject(request.error || new Error("Falha ao ler o cache local."));
    });
    if (!session) return [];
    if (Date.now() - session.savedAt > TEMPORARY_CACHE_TTL) {
      database.close();
      await clearTemporaryFiles(key);
      return [];
    }
    return session.files.map(
      (file) => new File([file.data], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      }),
    );
  } finally {
    if (database.version) database.close();
  }
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
  const sessions = await readAllSessions(database);
  database.close();
  const now = Date.now();
  const validSessions = sessions.filter((session) => now - session.savedAt <= TEMPORARY_CACHE_TTL);
  const expiredSessions = sessions.filter((session) => now - session.savedAt > TEMPORARY_CACHE_TTL);
  await Promise.all(expiredSessions.map((session) => clearTemporaryFiles(session.key)));
  return validSessions.reduce<TemporaryCacheStatus>(
    (status, session) => {
      const sessionSize = sessionBytes(session);
      const sessionExpiresAt = session.savedAt + TEMPORARY_CACHE_TTL;
      return {
        sessionCount: status.sessionCount + 1,
        fileCount: status.fileCount + session.files.length,
        totalBytes: status.totalBytes + sessionSize,
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
