import { describe, it, expect } from "vitest";
import { sha256 } from "../src/sha256";

const enc = (s: string) => new TextEncoder().encode(s);

describe("sha256", () => {
  it("matches the known vector for the empty input", async () => {
    expect(await sha256(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
  it("matches the known vector for 'abc'", async () => {
    expect(await sha256(enc("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("gives the same hash for the same bytes", async () => {
    expect(await sha256(enc("same"))).toBe(await sha256(enc("same")));
  });
  it("changes when a single byte changes", async () => {
    const a = enc("result sheet");
    const b = enc("result sheet");
    b[0] = (b[0] ?? 0) ^ 1;
    expect(await sha256(a)).not.toBe(await sha256(b));
  });
  it("accepts an ArrayBuffer as well as a Uint8Array", async () => {
    const bytes = enc("abc");
    expect(await sha256(bytes.buffer as ArrayBuffer)).toBe(await sha256(bytes));
  });
});
