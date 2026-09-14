import { describe, expect, it } from "vitest";
import { manageSemesterSchema } from "@/features/settings/validation";

const input = {
  semesterId: "70000000-0000-4000-8000-000000000010",
  operation: "rename",
  name: "Corrected semester",
  confirmed: "yes",
};
describe("semester management validation", () => {
  it.each(["rename", "archive", "restore", "delete"])(
    "accepts confirmed %s",
    (operation) => {
      expect(
        manageSemesterSchema.safeParse({ ...input, operation }).success,
      ).toBe(true);
    },
  );
  it("requires explicit confirmation", () => {
    expect(
      manageSemesterSchema.safeParse({ ...input, confirmed: null }).success,
    ).toBe(false);
  });
  it("rejects empty corrections and unknown operations", () => {
    expect(
      manageSemesterSchema.safeParse({ ...input, name: "  " }).success,
    ).toBe(false);
    expect(
      manageSemesterSchema.safeParse({ ...input, operation: "purge" }).success,
    ).toBe(false);
  });
  it("rejects malformed identifiers", () => {
    expect(
      manageSemesterSchema.safeParse({ ...input, semesterId: "bad" }).success,
    ).toBe(false);
  });
});
