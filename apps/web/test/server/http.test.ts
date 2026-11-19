import { describe, it, expect, vi } from "vitest";
import { handle, readJson } from "../../lib/server/http";
import { HttpError } from "../../lib/server/ports";

const post = (body: string) => new Request("http://x.test/api", { method: "POST", body, headers: { "content-type": "application/json" } });

describe("readJson", () => {
  it("parses a JSON body", async () => expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 }));
  it("400s on invalid JSON", async () => {
    await expect(readJson(post("{nope"))).rejects.toMatchObject({ status: 400 });
  });
  it("413s on an oversized body", async () => {
    await expect(readJson(post(JSON.stringify({ x: "y".repeat(100_000) })))).rejects.toMatchObject({ status: 413 });
  });
});

describe("handle", () => {
  it("returns the value as JSON with 200", async () => {
    const res = await handle(async () => ({ ok: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it("maps HttpError to its status and message", async () => {
    const res = await handle(async () => { throw new HttpError(403, "nope"); });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "nope" });
  });
  it("hides unexpected errors behind a generic 500 and logs them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handle(async () => { throw new Error("db password is hunter2"); });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
  it("never lets a response be cached", async () => {
    const res = await handle(async () => ({}));
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
