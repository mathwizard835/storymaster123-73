/**
 * Client-side cache for text-to-speech audio.
 *
 * Audio is the largest egress source in the app: every "Read to Me" tap
 * returns a base64 MP3 from the edge function. This cache stores the base64
 * locally so replays/re-reads of the same scene do not cost any Supabase
 * egress.
 *
 * The cache uses IndexedDB when available (mobile-friendly, large storage)
 * and falls back to an in-memory Map. It keeps at most MAX_ENTRIES and evicts
 * the least-recently-used entry when the limit is exceeded.
 */

const DB_NAME = "storymaster_tts_cache";
const STORE_NAME = "audio";
const DB_VERSION = 1;
const MAX_ENTRIES = 50;

// In-memory fallback for environments without IndexedDB or private browsing.
const memoryCache = new Map<string, string>();
const lruOrder = new Set<string>();

function hashKey(text: string, voiceId: string): string {
  const str = `${voiceId}:${text}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function touchKey(key: string) {
  lruOrder.delete(key);
  lruOrder.add(key);
}

function enforceMemoryLimit() {
  while (lruOrder.size > MAX_ENTRIES) {
    const oldest = lruOrder.values().next().value as string | undefined;
    if (!oldest) break;
    lruOrder.delete(oldest);
    memoryCache.delete(oldest);
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        console.warn("[ttsCache] IndexedDB failed, using memory cache");
        resolve(null);
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("accessed_at", "accessed_at", { unique: false });
        }
      };
    });
  }
  return dbPromise;
}

async function evictOldestIfNeeded(db: IDBDatabase) {
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("accessed_at");
    const countReq = store.count();
    countReq.onsuccess = () => {
      const count = countReq.result;
      if (count < MAX_ENTRIES) {
        resolve();
        return;
      }
      const cursorReq = index.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const deleteTx = db.transaction(STORE_NAME, "readwrite");
          deleteTx.objectStore(STORE_NAME).delete(cursor.value.key);
          deleteTx.oncomplete = () => resolve();
          deleteTx.onerror = () => resolve();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => resolve();
    };
    countReq.onerror = () => resolve();
  });
}

export async function getCachedAudio(text: string, voiceId: string): Promise<string | null> {
  const key = hashKey(text, voiceId);

  // Memory first
  const mem = memoryCache.get(key);
  if (mem !== undefined) {
    touchKey(key);
    return mem;
  }

  // IndexedDB second
  const db = await openDb();
  if (!db) return null;

  return new Promise<string | null>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (entry?.audioContent) {
        store.put({ ...entry, accessed_at: Date.now() });
        memoryCache.set(key, entry.audioContent);
        touchKey(key);
        enforceMemoryLimit();
        resolve(entry.audioContent);
      } else {
        resolve(null);
      }
    };
    getReq.onerror = () => resolve(null);
  });
}

export async function setCachedAudio(text: string, voiceId: string, audioContent: string): Promise<void> {
  const key = hashKey(text, voiceId);
  memoryCache.set(key, audioContent);
  touchKey(key);
  enforceMemoryLimit();

  const db = await openDb();
  if (!db) return;

  await evictOldestIfNeeded(db);

  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      key,
      audioContent,
      accessed_at: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Fetch audio from the edge function, using the cache as a first-class source.
 * Returns the base64 audio content string. Throws on network/generation errors.
 */
export async function fetchAudioWithCache(
  text: string,
  voiceId: string,
  guest = false
): Promise<string> {
  const cached = await getCachedAudio(text, voiceId);
  if (cached) {
    console.log("[ttsCache] cache hit — skipping edge function request");
    return cached;
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("text-to-speech", {
    body: { text, voiceId, guest },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate audio");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  if (!data?.audioContent) {
    throw new Error("No audio content returned");
  }

  await setCachedAudio(text, voiceId, data.audioContent);
  return data.audioContent;
}

/**
 * Clear the entire TTS cache. Useful for logout or debugging.
 */
export async function clearTtsCache(): Promise<void> {
  memoryCache.clear();
  lruOrder.clear();
  const db = await openDb();
  if (!db) return;
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
