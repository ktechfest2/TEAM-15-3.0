/** Offline capture queue in IndexedDB. Items keep the original bytes and the on-device fingerprint. */
export interface QueueInput {
  unitCode: string;
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
  sha256: string;
  capturedAt: string;
}
export interface QueueItem extends QueueInput {
  id: string;
  status: "waiting";
  /** Upload progress, kept so a retry resumes instead of creating a second submission. */
  submissionId?: string;
  path?: string;
  token?: string;
  uploaded?: boolean;
  error?: string;
}

const DB = "voteguard";
const STORE = "queue";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function addToQueue(input: QueueInput): Promise<QueueItem> {
  const item: QueueItem = { ...input, id: crypto.randomUUID(), status: "waiting" };
  await run("readwrite", (s) => s.add(item));
  return item;
}

export async function listQueue(): Promise<QueueItem[]> {
  const all = await run<QueueItem[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function removeFromQueue(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function clearQueue(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}

/** Merge progress into a queued item (read and write in one transaction). */
export async function updateQueueItem(id: string, patch: Partial<Omit<QueueItem, "id" | "bytes">>): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const get = store.get(id);
    get.onsuccess = () => {
      if (get.result) store.put({ ...get.result, ...patch });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}
