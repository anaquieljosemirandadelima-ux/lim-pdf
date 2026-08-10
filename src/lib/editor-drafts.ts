import { TEMPORARY_CACHE_TTL } from "@/lib/temporary-cache";

export const EDITOR_DRAFT_PREFIX = "limpdf-editor-draft:";
export const EDITOR_RECENTS_KEY = "limpdf-editor-recents-v1";

type StoredEditorDraft = {
  fileKey?: string;
  updatedAt?: string;
};

type StoredEditorRecent = {
  fileKey?: string;
  updatedAt?: string;
};

export type EditorDraftStorageStatus = {
  draftCount: number;
  totalBytes: number;
  expiresAt: number | null;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function utf8Bytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function cleanupExpiredEditorDrafts(now = Date.now()) {
  if (!isBrowser()) return 0;
  let removed = 0;
  const validFileKeys = new Set<string>();

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(EDITOR_DRAFT_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    const draft = safeParse<StoredEditorDraft>(raw);
    const updatedAt = parseDate(draft?.updatedAt);
    const expired = !updatedAt || now - updatedAt > TEMPORARY_CACHE_TTL;
    if (expired) {
      window.localStorage.removeItem(key);
      removed += 1;
      continue;
    }
    const fileKey = draft?.fileKey || key.slice(EDITOR_DRAFT_PREFIX.length);
    if (fileKey) validFileKeys.add(fileKey);
  }

  const recents = safeParse<StoredEditorRecent[]>(window.localStorage.getItem(EDITOR_RECENTS_KEY)) || [];
  const nextRecents = recents.filter((item) => {
    const updatedAt = parseDate(item.updatedAt);
    return Boolean(item.fileKey && updatedAt && now - updatedAt <= TEMPORARY_CACHE_TTL && validFileKeys.has(item.fileKey));
  });
  if (nextRecents.length) window.localStorage.setItem(EDITOR_RECENTS_KEY, JSON.stringify(nextRecents.slice(0, 6)));
  else window.localStorage.removeItem(EDITOR_RECENTS_KEY);

  return removed;
}

export function getEditorDraftStorageStatus(now = Date.now()): EditorDraftStorageStatus {
  if (!isBrowser()) return { draftCount: 0, totalBytes: 0, expiresAt: null };
  cleanupExpiredEditorDrafts(now);
  let draftCount = 0;
  let totalBytes = 0;
  let expiresAt: number | null = null;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(EDITOR_DRAFT_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    const draft = safeParse<StoredEditorDraft>(raw);
    const updatedAt = parseDate(draft?.updatedAt);
    if (!raw || !updatedAt) continue;
    draftCount += 1;
    totalBytes += utf8Bytes(raw);
    const expiry = updatedAt + TEMPORARY_CACHE_TTL;
    expiresAt = expiresAt === null ? expiry : Math.min(expiresAt, expiry);
  }

  return { draftCount, totalBytes, expiresAt };
}

export function clearAllEditorDrafts() {
  if (!isBrowser()) return;
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(EDITOR_DRAFT_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.removeItem(EDITOR_RECENTS_KEY);
}
