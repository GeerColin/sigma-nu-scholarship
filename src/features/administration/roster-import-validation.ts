import { z } from "zod";

const rosterRowSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  status: z.enum(["active", "inactive", "alumni"]),
});

export const rosterImportSchema = z.object({
  confirmed: z.literal("yes"),
  rows: z.array(rosterRowSchema).min(1).max(1000),
});
