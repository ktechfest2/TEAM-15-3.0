import { describe, it, expect } from "vitest";
import { chainAuditEvent, verifyChain } from "../src/chain";
import type { AuditEvent } from "@voteguard/shared";

async function build(n: number): Promise<AuditEvent[]> {
  const out: AuditEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      await chainAuditEvent(out[i - 1] ?? null, {
        type: i === 0 ? "captured" : "received",
        subject_id: "sub-1",
        payload: { n: i, note: "demo" },
        created_at: `2026-11-20T01:0${i}:00Z`,
      }),
    );
  }
  return out;
}

describe("audit chain", () => {
  it("starts with a null previous hash", async () => {
    const [first] = await build(1);
    expect(first!.prev_hash).toBeNull();
    expect(first!.hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("links each event to the previous event's hash", async () => {
    const [a, b, c] = await build(3);
    expect(b!.prev_hash).toBe(a!.hash);
    expect(c!.prev_hash).toBe(b!.hash);
  });
  it("is deterministic regardless of payload key order", async () => {
    const x = await chainAuditEvent(null, { type: "t", subject_id: "s", payload: { a: 1, b: 2 }, created_at: "z" });
    const y = await chainAuditEvent(null, { type: "t", subject_id: "s", payload: { b: 2, a: 1 }, created_at: "z" });
    expect(x.hash).toBe(y.hash);
  });
  it("verifies an untouched chain, including an empty one", async () => {
    expect(await verifyChain(await build(4))).toEqual({ ok: true });
    expect(await verifyChain([])).toEqual({ ok: true });
  });
  it("detects an altered event and names it", async () => {
    const events = await build(4);
    events[2] = { ...events[2]!, payload: { n: 99, note: "demo" } };
    expect(await verifyChain(events)).toEqual({ ok: false, index: 2, reason: "bad_hash" });
  });
  it("detects a removed event", async () => {
    const events = await build(4);
    events.splice(1, 1);
    const r = await verifyChain(events);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.index).toBe(1);
  });
});
