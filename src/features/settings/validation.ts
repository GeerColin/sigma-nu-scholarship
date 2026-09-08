import { z } from "zod";

export const semesterSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    timezone: z.string().trim().min(1).max(100),
    deadlineWeekday: z.coerce.number().int().min(0).max(6),
    deadlineTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    makeActive: z.boolean(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "The end date must not precede the start date.",
  });

export const activateSemesterSchema = z.object({
  semesterId: z.string().uuid(),
});

export const deadlineOverrideSchema = z.object({
  weekId: z.string().uuid(),
  deadlineDate: z.iso.date(),
  deadlineTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
