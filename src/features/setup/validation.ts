import { z } from "zod";

export const bootstrapChapterSchema = z.object({
  bootstrapToken: z.string().trim().min(16).max(256),
  fraternityName: z.string().trim().min(2).max(100),
  chapterName: z.string().trim().min(2).max(100),
  institutionName: z.string().trim().min(2).max(160),
  chairName: z.string().trim().min(2).max(150),
  confirmed: z.literal("yes"),
});
