import { describe, expect, it } from "vitest";
import {
  acknowledgeAlertSchema,
  customGradingReviewSchema,
} from "@/features/academics/validation";

describe("academic review validation", () => {
  it("accepts supported Custom/Other decisions", () => {
    expect(
      customGradingReviewSchema.safeParse({
        courseId: "10000000-0000-4000-8000-000000000001",
        treatment: "exclude",
        reason: "Synthetic review",
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported conversions and blank audit reasons", () => {
    expect(
      customGradingReviewSchema.safeParse({
        courseId: "10000000-0000-4000-8000-000000000001",
        treatment: "custom_conversion",
        reason: "Synthetic review",
      }).success,
    ).toBe(false);
    expect(
      acknowledgeAlertSchema.safeParse({
        alertId: "10000000-0000-4000-8000-000000000001",
        reason: " ",
      }).success,
    ).toBe(false);
  });
});
