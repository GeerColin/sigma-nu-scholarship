import { z } from "zod";

export const submissionFilters = [
  "all",
  "on_time",
  "late",
  "awaiting",
  "missing",
  "not_required",
  "eligibility_unknown",
] as const;
export const hourFilters = [
  "all",
  "incomplete",
  "complete",
  "not_required",
  "not_assigned",
] as const;

export const weeklyReviewQuerySchema = z.object({
  week: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().safe())
    .optional(),
  status: z.enum(submissionFilters).default("all"),
  hours: z.enum(hourFilters).default("all"),
});

export type WeeklyReviewQuery = z.infer<typeof weeklyReviewQuerySchema>;

export function weeklyReviewHref(query: WeeklyReviewQuery) {
  const params = new URLSearchParams();
  if (query.week !== undefined) params.set("week", String(query.week));
  if (query.status !== "all") params.set("status", query.status);
  if (query.hours !== "all") params.set("hours", query.hours);
  return `/this-week${params.size ? `?${params}` : ""}`;
}
