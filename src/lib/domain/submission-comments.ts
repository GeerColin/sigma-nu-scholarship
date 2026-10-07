import { z } from "zod";

export function submissionCommentWordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export const submissionCommentSchema = z
  .string()
  .trim()
  .max(1000, "Use 1,000 characters or fewer for your comment.")
  .refine(
    (value) => submissionCommentWordCount(value) <= 30,
    "Use 30 words or fewer for your comment.",
  )
  .optional();
