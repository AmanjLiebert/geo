import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("combines class strings correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles falsy values, arrays, and conditional objects", () => {
    expect(cn("foo", false && "hidden", undefined, null, ["nested", true && "item"], { active: true, disabled: false }))
      .toBe("foo nested item active");
  });
});
