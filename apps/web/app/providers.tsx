"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createApi, type Api } from "../lib/client/api";
import { DEFAULT_PREFS, PREFS_KEY, htmlAttributes, parsePrefs, type Prefs } from "../lib/client/prefs";
import { htmlLang } from "../lib/guide/langs";
import { addReceipt, loadReceipts, type Receipt } from "../lib/client/receipts";
import { syncAll } from "../lib/client/sync";
import { getBrowserClient } from "../lib/client/supabase";
import { listQueue, removeFromQueue, updateQueueItem, type QueueItem } from "../lib/queue";

export interface SessionState { loading: boolean; email: string | null; role: "observer" | "reviewer" | null }

interface AppContext {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  session: SessionState;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  api: Api;
  online: boolean;
  queue: QueueItem[];
  refreshQueue: () => Promise<void>;
  syncNow: () => Promise<void>;
  syncing: boolean;
  syncMessage: string;
  receipts: Receipt[];
}

const Ctx = createContext<AppContext | null>(null);
export function useApp(): AppContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside Providers");
  return v;
}

export function Providers({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getBrowserClient(), []);
  const api = useMemo(
    () => createApi({
      fetch: (...a) => fetch(...a),
      getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    }),
    [supabase],
  );

  // ---- offline shell: the service worker lets the capture flow open with no signal
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* offline mode is a bonus, not required */ });
    }
  }, []);

  // ---- accessibility preferences (A2), saved on this device
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    try { setPrefsState(parsePrefs(localStorage.getItem(PREFS_KEY))); } catch { /* blocked storage: defaults */ }
  }, []);
  useEffect(() => {
    const a = htmlAttributes(prefs);
    const el = document.documentElement;
    el.dataset.contrast = a.contrast;
    el.dataset.motion = a.motion;
    el.style.setProperty("--scale", a.scale);
    el.lang = htmlLang(prefs.lang);
  }, [prefs]);
  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((old) => {
      const next = { ...old, ...p };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* keep in memory only */ }
      return next;
    });
  }, []);

  // ---- session
  const [session, setSession] = useState<SessionState>({ loading: true, email: null, role: null });
  useEffect(() => {
    let live = true;
    async function load(hasSession: boolean, email: string | null) {
      if (!hasSession) return live && setSession({ loading: false, email: null, role: null });
      try {
        const me = await api.me();
        if (live) setSession({ loading: false, email, role: me.role });
      } catch {
        // Offline or server hiccup: stay signed in as an observer; the server still checks every request.
        if (live) setSession({ loading: false, email, role: "observer" });
      }
    }
    supabase.auth.getSession().then(({ data }) => load(!!data.session, data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void load(!!s, s?.user.email ?? null); });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, [supabase, api]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? "That email and password did not work. Please check and try again." : null;
  }, [supabase]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, [supabase]);

  // ---- connection, offline queue and background sync (8.1)
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const busy = useRef(false);

  const refreshQueue = useCallback(async () => { try { setQueue(await listQueue()); } catch { /* no IndexedDB */ } }, []);
  useEffect(() => {
    setOnline(navigator.onLine);
    setReceipts(loadReceipts());
    void refreshQueue();
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [refreshQueue]);

  const syncNow = useCallback(async () => {
    if (busy.current) return;
    const items = await listQueue().catch(() => [] as QueueItem[]);
    if (items.length === 0) return;
    busy.current = true; setSyncing(true); setSyncMessage("");
    try {
      const results = await syncAll(items, {
        api,
        putFile: async (path, token, bytes, mime) => {
          const { error } = await supabase.storage.from("evidence").uploadToSignedUrl(path, token, new Blob([bytes], { type: mime }), { contentType: mime });
          if (!error) return "ok";
          if (/already exists/i.test(error.message)) return "exists";
          throw new Error(error.message);
        },
        update: (id, patch) => updateQueueItem(id, patch),
        remove: (id) => removeFromQueue(id),
      });
      for (const r of results) {
        if (!r.ok || !r.submissionId) continue;
        const item = items.find((i) => i.id === r.id)!;
        setReceipts(addReceipt({ submissionId: r.submissionId, unitCode: item.unitCode, sha256: item.sha256, capturedAt: item.capturedAt, syncedAt: new Date().toISOString() }));
      }
      const failed = results.filter((r) => !r.ok);
      if (results.some((r) => r.needsSignIn)) setSyncMessage("Please sign in to upload the photos waiting on this phone.");
      else if (failed.length) setSyncMessage("Some photos could not be uploaded yet. They are still saved on this phone and will be tried again.");
      else setSyncMessage("");
    } finally {
      busy.current = false; setSyncing(false); await refreshQueue();
    }
  }, [api, supabase, refreshQueue]);

  const signedIn = !!session.email;
  useEffect(() => {
    if (online && signedIn) void syncNow();
  }, [online, signedIn, queue.length, syncNow]);

  const value: AppContext = { prefs, setPrefs, session, signIn, signOut, api, online, queue, refreshQueue, syncNow, syncing, syncMessage, receipts };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
