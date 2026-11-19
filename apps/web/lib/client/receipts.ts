/** A small on-device record of what was uploaded, so the person has a receipt after syncing. */
export interface Receipt {
  submissionId: string;
  unitCode: string;
  sha256: string;
  capturedAt: string;
  syncedAt: string;
}

const KEY = "voteguard.receipts";
const MAX = 20;

export function loadReceipts(): Receipt[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? (v as Receipt[]) : [];
  } catch { return []; }
}

export function addReceipt(r: Receipt): Receipt[] {
  const all = [r, ...loadReceipts().filter((x) => x.submissionId !== r.submissionId)].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage full or blocked: receipt is a convenience */ }
  return all;
}
