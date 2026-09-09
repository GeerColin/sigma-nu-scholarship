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

export const manageMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["proctor", "admin"]),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const transferChairSchema = z.object({
  successorMemberId: z.string().uuid(),
  outgoingRoles: z
    .array(z.enum(["member", "proctor", "admin"]))
    .min(1)
    .refine((roles) => roles.includes("member")),
  confirmed: z.literal("yes"),
});
