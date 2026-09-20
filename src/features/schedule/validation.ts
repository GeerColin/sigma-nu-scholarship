import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use a valid 24-hour time.");

const proctorIdsSchema = z.array(z.string().uuid()).min(1);

export const scheduleSeriesSchema = z
  .object({
    semesterId: z.string().uuid(),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    location: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(1000).optional(),
    proctorMemberIds: proctorIdsSchema,
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const updateScheduleSeriesSchema = scheduleSeriesSchema.extend({
  seriesId: z.string().uuid(),
});

export const removeScheduleSeriesSchema = z.object({
  seriesId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

export const manageScheduleOccurrenceSchema = z
  .object({
    occurrenceId: z.string().uuid(),
    operation: z.enum(["override", "cancel", "restore"]),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    location: z.string().trim().max(200).optional(),
    instructions: z.string().trim().max(1000).optional(),
    reason: z.string().trim().max(500).optional(),
    week: z.string().regex(/^\d+$/).optional(),
  })
  .superRefine((value, context) => {
    if (value.operation === "override") {
      if (
        !value.startTime ||
        !value.endTime ||
        value.endTime <= value.startTime
      ) {
        context.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "End time must be after start time.",
        });
      }
      if (!value.location) {
        context.addIssue({
          code: "custom",
          path: ["location"],
          message: "Location is required.",
        });
      }
    }
    if (value.operation === "cancel" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A cancellation reason is required.",
      });
    }
  });

export const proctorScheduleEditSchema = z
  .object({
    occurrenceId: z.string().uuid(),
    startTime: timeSchema,
    endTime: timeSchema,
    location: z.string().trim().min(1).max(200),
    week: z.string().regex(/^\d+$/).optional(),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const scheduleNotificationSchema = z.object({
  notificationId: z.string().uuid(),
});

export function formProctorIds(formData: FormData) {
  return proctorIdsSchema.safeParse(
    formData
      .getAll("proctorMemberIds")
      .map((value) => String(value))
      .filter(Boolean),
  );
}
