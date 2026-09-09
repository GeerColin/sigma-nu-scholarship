import { z } from "zod";
import { emailTemplateSchema } from "@/lib/email/templates";

export const prepareEmailBatchSchema = z.object({
  weekId: z.string().uuid(),
  batchType: z.enum([
    "missing_grade_reminder",
    "study_hour_assignment",
    "academic_alert",
  ]),
});

export const emailBatchIdSchema = z.object({
  batchId: z.string().uuid(),
});

export const editEmailBatchSchema = emailBatchIdSchema.extend({
  subject: emailTemplateSchema.shape.subject,
  body: emailTemplateSchema.shape.body,
});

export const editEmailMessageSchema = z.object({
  messageId: z.string().uuid(),
  subject: emailTemplateSchema.shape.subject,
  body: emailTemplateSchema.shape.body,
  selected: z.boolean(),
});
