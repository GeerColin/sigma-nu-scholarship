import { z } from "zod";

const ruleHoursSchema = z.coerce.number().int().min(0).max(24);

export const studyHourRuleSetSchema = z
  .object({
    gpa350To400Hours: ruleHoursSchema,
    gpa300To349Hours: ruleHoursSchema,
    gpa275To299Hours: ruleHoursSchema,
    gpa250To274Hours: ruleHoursSchema,
    gpa225To249Hours: ruleHoursSchema,
    gpa200To224Hours: ruleHoursSchema,
    gpaBelow200Hours: ruleHoursSchema,
    dAdjustmentHours: ruleHoursSchema,
    fAdjustmentHours: ruleHoursSchema,
    maximumHours: ruleHoursSchema,
    reason: z.string().trim().min(2).max(500),
    confirmed: z.literal(true),
  })
  .refine(
    ({ dAdjustmentHours, fAdjustmentHours }) =>
      fAdjustmentHours >= dAdjustmentHours,
    {
      message: "The F adjustment cannot be lower than the D adjustment.",
      path: ["fAdjustmentHours"],
    },
  );

export const refreshAssignmentsSchema = z.object({
  weekId: z.string().uuid(),
});

export const overrideAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  hours: z.coerce.number().int().min(0).max(24),
  reason: z.string().trim().min(2).max(500),
  confirmed: z.literal(true),
});

export const removeOverrideSchema = z.object({
  assignmentId: z.string().uuid(),
  reason: z.string().trim().min(2).max(500),
  confirmed: z.literal(true),
});

export const freezeAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  confirmed: z.literal(true),
});

export const resolveAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  decision: z.enum(["update", "keep"]),
  reason: z.string().trim().min(2).max(500),
});

export const editStudySessionSchema = z.object({
  sessionId: z.string().uuid(),
  date: z.iso.date(),
  hours: z.coerce.number().positive().max(24),
  notes: z.string().trim().max(500).optional(),
});

export const correctStudySessionSchema = editStudySessionSchema.extend({
  reason: z.string().trim().min(2).max(500),
});
