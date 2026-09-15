import { describe, expect, it } from "vitest";
import { removeArchivedCourseSchema } from "@/features/courses/validation";

const valid = {
  courseId: "80000000-0000-4000-8000-000000000030",
  memberId: "80000000-0000-4000-8000-000000000011",
  confirmed: "yes",
};

describe("archived course removal validation", () => {
  it("accepts an explicitly confirmed removal", () => {
    expect(removeArchivedCourseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing confirmation and malformed identifiers", () => {
    expect(
      removeArchivedCourseSchema.safeParse({ ...valid, confirmed: null })
        .success,
    ).toBe(false);
    expect(
      removeArchivedCourseSchema.safeParse({ ...valid, courseId: "bad" })
        .success,
    ).toBe(false);
  });
});
