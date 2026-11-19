import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApi, ApiError } from "../lib/client/api";
import { syncItem, syncAll, type SyncPorts } from "../lib/client/sync";
import { parsePrefs, DEFAULT_PREFS, htmlAttributes } from "../lib/client/prefs";
import { pickVoice } from "../lib/client/speech";
import { addToQueue, listQueue, updateQueueItem, clearQueue, type QueueItem } from "../lib/queue";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("api client", () => {
  it("sends the bearer token when signed in and none when not", async () => {
    const f = vi.fn(async (_u: string, _i: RequestInit) => json(200, { role: "observer" }));
    await createApi({ fetch: f as any, getToken: async () => "abc" }).me();
    expect((f.mock.calls[0]![1] as any).headers.authorization).toBe("Bearer abc");
    const g = vi.fn(async (_u: string, _i: RequestInit) => json(200, { units: [] }));
    await createApi({ fetch: g as any, getToken: async () => null }).units({});
    expect((g.mock.calls[0]![1] as any).headers.authorization).toBeUndefined();
  });
  it("builds the units query string and skips empty filters", async () => {
    const f = vi.fn(async (_u: string, _i: RequestInit) => json(200, { units: [] }));
    await createApi({ fetch: f as any, getToken: async () => null }).units({ state: "Lagos", q: "", ward: undefined });
    expect(f.mock.calls[0]![0]).toBe("/api/units?state=Lagos");
  });
  it("turns an error response into an ApiError with the server's message", async () => {
    const api = createApi({ fetch: (async () => json(403, { error: "Only reviewers can do this." })) as any, getToken: async () => "t" });
    await expect(api.dashboard()).rejects.toMatchObject({ status: 403, message: "Only reviewers can do this." });
  });
  it("reports a network failure as status 0 so callers can queue instead", async () => {
    const api = createApi({ fetch: (async () => { throw new TypeError("Failed to fetch"); }) as any, getToken: async () => null });
    const err = await api.dashboard().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });
  it("posts JSON bodies", async () => {
    const f = vi.fn(async (_u: string, _i: RequestInit) => json(200, {}));
    await createApi({ fetch: f as any, getToken: async () => "t" }).review({ polling_unit_id: "u", decision: "leave_open", note: "n" });
    const init = f.mock.calls[0]![1] as any;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ decision: "leave_open" });
  });
});

describe("offline queue updates", () => {
  beforeEach(async () => { await clearQueue(); });
  it("stores upload progress on the item so a retry can resume", async () => {
    const item = await addToQueue({ unitCode: "X", fileName: "a.png", mimeType: "image/png", bytes: new ArrayBuffer(3), sha256: "a".repeat(64), capturedAt: "2026-11-19T19:00:00.000Z" });
    await updateQueueItem(item.id, { submissionId: "s1", uploaded: true });
    const [again] = await listQueue();
    expect(again).toMatchObject({ id: item.id, submissionId: "s1", uploaded: true, unitCode: "X" });
    expect(again!.bytes.byteLength).toBe(3);
  });
});

function item(over: Partial<QueueItem> = {}): QueueItem {
  return { id: "q1", status: "waiting", unitCode: "LA-IKJ-04-012", fileName: "a.png", mimeType: "image/png", bytes: new ArrayBuffer(4), sha256: "a".repeat(64), capturedAt: "2026-11-19T19:00:00.000Z", ...over };
}
function ports(over: Partial<SyncPorts> = {}) {
  const calls: string[] = [];
  const updates: Record<string, unknown>[] = [];
  const p: SyncPorts = {
    api: {
      units: async () => { calls.push("units"); return { units: [{ id: "unit-1", code: "LA-IKJ-04-012" }, { id: "unit-2", code: "LA-IKJ-04-0120" }] } as any; },
      createUpload: async () => { calls.push("createUpload"); return { submission_id: "sub-1", path: "sub-1.png", token: "tok", signed_url: "u" }; },
      extract: async () => { calls.push("extract"); return {} as any; },
    },
    putFile: async () => { calls.push("putFile"); return "ok"; },
    update: async (_id, patch) => { updates.push(patch as any); },
    remove: async () => { calls.push("remove"); },
    ...over,
  };
  return { p, calls, updates };
}

describe("syncItem", () => {
  it("creates the upload, stores the file, extracts, and removes the item from the queue", async () => {
    const { p, calls } = ports();
    expect(await syncItem(item(), p)).toEqual({ submissionId: "sub-1" });
    expect(calls).toEqual(["units", "createUpload", "putFile", "extract", "remove"]);
  });
  it("matches the unit by exact code, not by the search results order", async () => {
    const { p } = ports({ api: { ...ports().p.api, units: async () => ({ units: [{ id: "unit-2", code: "LA-IKJ-04-0120" }, { id: "unit-1", code: "LA-IKJ-04-012" }] }) as any, createUpload: async (b: any) => { expect(b.polling_unit_id).toBe("unit-1"); return { submission_id: "s", path: "s.png", token: "t", signed_url: "u" }; } } });
    await syncItem(item(), p);
  });
  it("sends the on-device fingerprint and capture time, not values it computed later", async () => {
    let sent: any;
    const { p } = ports({ api: { ...ports().p.api, createUpload: async (b: any) => { sent = b; return { submission_id: "s", path: "s.png", token: "t", signed_url: "u" }; } } });
    await syncItem(item(), p);
    expect(sent).toMatchObject({ sha256: "a".repeat(64), captured_at: "2026-11-19T19:00:00.000Z", content_type: "image/png", polling_unit_id: "unit-1" });
  });
  it("resumes without creating a second submission when the file upload failed last time", async () => {
    const { p, calls } = ports();
    await syncItem(item({ submissionId: "sub-1", path: "sub-1.png", token: "tok" }), p);
    expect(calls).not.toContain("createUpload");
    expect(calls).toContain("putFile");
  });
  it("skips the file upload when it already finished, and just extracts", async () => {
    const { p, calls } = ports();
    await syncItem(item({ submissionId: "sub-1", path: "sub-1.png", token: "tok", uploaded: true }), p);
    expect(calls).toEqual(["extract", "remove"]);
  });
  it("saves progress after each step so a crash loses nothing", async () => {
    const { p, updates } = ports({ extract: undefined, api: { ...ports().p.api, extract: async () => { throw new ApiError(0, "offline"); } } } as any);
    await expect(syncItem(item(), p)).rejects.toMatchObject({ status: 0 });
    expect(updates).toEqual([{ submissionId: "sub-1", path: "sub-1.png", token: "tok" }, { uploaded: true }]);
  });
  it("treats 'already exists' from storage as uploaded (write-once makes retries safe)", async () => {
    const { p, calls } = ports({ putFile: async () => "exists" });
    await syncItem(item({ submissionId: "sub-1", path: "sub-1.png", token: "tok" }), p);
    expect(calls).toContain("extract");
  });
  it("fails clearly when the unit code is not known to the server", async () => {
    const { p } = ports({ api: { ...ports().p.api, units: async () => ({ units: [] }) as any } });
    await expect(syncItem(item(), p)).rejects.toThrow(/unit/i);
  });
});

describe("syncAll", () => {
  it("syncs items in order and keeps going after one fails, reporting each outcome", async () => {
    const { p } = ports();
    const failing = { ...p, api: { ...p.api, createUpload: vi.fn().mockRejectedValueOnce(new ApiError(0, "offline")).mockResolvedValue({ submission_id: "s2", path: "s2.png", token: "t", signed_url: "u" }) } };
    const res = await syncAll([item({ id: "a" }), item({ id: "b" })], failing);
    expect(res.map((r) => [r.id, r.ok])).toEqual([["a", false], ["b", true]]);
  });
  it("stops at once on 401 so the person is asked to sign in again", async () => {
    const { p } = ports();
    const denied = { ...p, api: { ...p.api, createUpload: async () => { throw new ApiError(401, "Please sign in."); } } };
    const res = await syncAll([item({ id: "a" }), item({ id: "b" })], denied);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ ok: false, needsSignIn: true });
  });
});

describe("accessibility preferences", () => {
  it("falls back to defaults for missing or corrupt storage", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{nope")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('"string"')).toEqual(DEFAULT_PREFS);
  });
  it("keeps valid values and replaces invalid ones one by one", () => {
    const p = parsePrefs(JSON.stringify({ lang: "pcm", textScale: 1.5, contrast: true, reduceMotion: "yes", slowVoice: true, extra: 1 }));
    expect(p).toEqual({ ...DEFAULT_PREFS, lang: "pcm", textScale: 1.5, contrast: true, slowVoice: true });
  });
  it("only allows the offered text sizes", () => {
    expect(parsePrefs(JSON.stringify({ textScale: 9 })).textScale).toBe(DEFAULT_PREFS.textScale);
  });
  it("maps preferences to html attributes and the text-scale variable", () => {
    expect(htmlAttributes({ ...DEFAULT_PREFS, contrast: true, reduceMotion: true, textScale: 1.25 })).toEqual({ contrast: "high", motion: "reduce", scale: "1.25" });
    expect(htmlAttributes(DEFAULT_PREFS)).toEqual({ contrast: "normal", motion: "auto", scale: "1" });
  });
});

describe("pickVoice", () => {
  const v = (lang: string, name = lang) => ({ lang, name }) as SpeechSynthesisVoice;
  it("prefers a Nigerian English voice, then any English voice", () => {
    expect(pickVoice([v("en-US"), v("en-NG", "Nigeria")], "en")?.name).toBe("Nigeria");
    expect(pickVoice([v("fr-FR"), v("en-GB")], "en")?.lang).toBe("en-GB");
  });
  it("returns null when there is no suitable voice, so the app shows text instead of faking audio", () => {
    expect(pickVoice([v("fr-FR")], "en")).toBeNull();
    expect(pickVoice([], "en")).toBeNull();
  });
  it("never speaks Pidgin with an English voice", () => {
    expect(pickVoice([v("en-NG"), v("en-US")], "pcm")).toBeNull();
  });
});
