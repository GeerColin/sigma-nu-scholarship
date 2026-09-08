import { z } from "zod";

export const approveAccessRequestSchema = z.object({
  requestId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const rejectAccessRequestSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(2).max(500),
});

export const disconnectAccountSchema = z.object({
  memberId: z.string().uuid(),
  reason: z.string().trim().min(2).max(500),
});
