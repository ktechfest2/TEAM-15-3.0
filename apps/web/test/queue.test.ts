import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { addToQueue, listQueue, removeFromQueue, clearQueue } from "../lib/queue";

const item = (over = {}) => ({
  unitCode: "LA-IKJ-04-012",
  fileName: "sheet.jpg",
  mimeType: "image/jpeg",
  bytes: new Uint8Array([1, 2, 3]).buffer,
  sha256: "a".repeat(64),
  capturedAt: "2026-11-20T01:00:00.000Z",
  ...over,
});

beforeEach(async () => clearQueue());

describe("offline capture queue", () => {
  it("starts empty", async () => {
    expect(await listQueue()).toEqual([]);
  });
  it("stores an item with its fingerprint and capture time, waiting to upload", async () => {
    const saved = await addToQueue(item());
    expect(saved.id).toBeTruthy();
    const [first] = await listQueue();
    expect(first).toMatchObject({ unitCode: "LA-IKJ-04-012", sha256: "a".repeat(64), capturedAt: "2026-11-20T01:00:00.000Z", status: "waiting" });
  });
  it("keeps the original bytes untouched", async () => {
    await addToQueue(item());
    const [first] = await listQueue();
    expect([...new Uint8Array(first!.bytes)]).toEqual([1, 2, 3]);
  });
  it("lists items oldest first", async () => {
    await addToQueue(item({ capturedAt: "2026-11-20T01:00:02.000Z", fileName: "b.jpg" }));
    await addToQueue(item({ capturedAt: "2026-11-20T01:00:01.000Z", fileName: "a.jpg" }));
    expect((await listQueue()).map((i) => i.fileName)).toEqual(["a.jpg", "b.jpg"]);
  });
  it("removes an item once it has been uploaded", async () => {
    const a = await addToQueue(item());
    await addToQueue(item({ fileName: "other.jpg" }));
    await removeFromQueue(a.id);
    expect((await listQueue()).map((i) => i.fileName)).toEqual(["other.jpg"]);
  });
});
