import { z } from "zod";

export const customGradingReviewSchema = z.object({
  courseId: z.string().uuid(),
  treatment: z.enum(["exclude", "pass_fail"]),
  reason: z.string().trim().min(2).max(500),
});

export const acknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
  reason: z.string().trim().min(2).max(500),
});
