import { describe, expect, it } from "vitest";
import {
  approveAccessRequestSchema,
  disconnectAccountSchema,
  rejectAccessRequestSchema,
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
});
