import { describe, expect, it } from "vitest";
import {
  approveAccessRequestSchema,
  disconnectAccountSchema,
  manageMemberRoleSchema,
  rejectAccessRequestSchema,
  transferChairSchema,
} from "@/features/administration/access-validation";

const requestId = "10000000-0000-4000-8000-000000000001";
const memberId = "10000000-0000-4000-8000-000000000002";

describe("account-management validation", () => {
  it("accepts a valid approval link", () => {
    expect(
      approveAccessRequestSchema.safeParse({ requestId, memberId }).success,
    ).toBe(true);
  });

  it("rejects malformed identifiers", () => {
    expect(
      approveAccessRequestSchema.safeParse({ requestId: "bad", memberId })
        .success,
    ).toBe(false);
  });

  it("requires meaningful rejection and disconnection reasons", () => {
    expect(
      rejectAccessRequestSchema.safeParse({ requestId, reason: " " }).success,
    ).toBe(false);
    expect(
      disconnectAccountSchema.safeParse({ memberId, reason: "Wrong link" })
        .success,
    ).toBe(true);
  });

  it("allows only explicit Proctor and Admin role changes", () => {
    expect(
      manageMemberRoleSchema.safeParse({
        memberId,
        role: "proctor",
        enabled: "true",
      }).data?.enabled,
    ).toBe(true);
    expect(
      manageMemberRoleSchema.safeParse({
        memberId,
        role: "scholarship_chair",
        enabled: "false",
      }).success,
    ).toBe(false);
  });

  it("requires explicit confirmation and preserves the outgoing Member role for handoff", () => {
    expect(
      transferChairSchema.safeParse({
        successorMemberId: memberId,
        outgoingRoles: ["member", "admin"],
        confirmed: "yes",
      }).success,
    ).toBe(true);
    expect(
      transferChairSchema.safeParse({
        successorMemberId: memberId,
        outgoingRoles: ["admin"],
        confirmed: "yes",
      }).success,
    ).toBe(false);
  });
});
