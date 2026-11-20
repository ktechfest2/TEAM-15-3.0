import { describe, it, expect } from "vitest";
import { parseFollowed, toggleFollow, whatChanged, rememberStatus } from "../../lib/plan/follow";

describe("follow a unit", () => {
  it("reads saved follows defensively", () => {
    expect(parseFollowed(null)).toEqual({});
    expect(parseFollowed("{nope")).toEqual({});
    expect(parseFollowed('["x"]')).toEqual({});
    expect(parseFollowed(JSON.stringify({ "IK-04-013": { status: "two_people_agree" }, bad: 5, "IK-04-014": { status: "nonsense" } })))
      .toEqual({ "IK-04-013": { status: "two_people_agree" } });
  });
  it("follows and unfollows", () => {
    const a = toggleFollow({}, "IK-04-013", "waiting_for_review");
    expect(a).toEqual({ "IK-04-013": { status: "waiting_for_review" } });
    expect(toggleFollow(a, "IK-04-013", "waiting_for_review")).toEqual({});
  });
  it("tells what changed since the last look", () => {
    const f = { "IK-04-013": { status: "waiting_for_review" as const } };
    expect(whatChanged(f, "IK-04-013", "two_people_agree")).toEqual({ from: "waiting_for_review", to: "two_people_agree" });
    expect(whatChanged(f, "IK-04-013", "waiting_for_review")).toBeNull();
    expect(whatChanged(f, "IK-04-099", "disputed")).toBeNull();
  });
  it("remembers the newest status once it has been shown", () => {
    const f = { "IK-04-013": { status: "waiting_for_review" as const } };
    expect(rememberStatus(f, "IK-04-013", "two_people_agree")["IK-04-013"]).toEqual({ status: "two_people_agree" });
    expect(rememberStatus(f, "IK-04-099", "disputed")).toEqual(f);
  });
});
