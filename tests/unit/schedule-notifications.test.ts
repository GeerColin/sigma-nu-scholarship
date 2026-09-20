import { afterEach, describe, expect, it, vi } from "vitest";
import { getScheduleNotifications } from "@/features/schedule/queries";
import { createClient } from "@/lib/supabase/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe("schedule notification reads", () => {
  it("disambiguates the actor profile relationship", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "notification-id",
          occurrence_id: "occurrence-id",
          before_state: {},
          after_state: {},
          created_at: "2026-09-20T12:00:00.000Z",
          read_at: null,
          profiles: {
            display_name: "Synthetic Proctor",
            email: "proctor@example.com",
          },
        },
      ],
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    vi.mocked(createClient).mockResolvedValue({ from } as never);

    const notifications = await getScheduleNotifications("chapter-id");

    expect(select).toHaveBeenCalledWith(
      "id, occurrence_id, before_state, after_state, created_at, read_at, profiles!study_schedule_notifications_actor_profile_id_fkey(display_name, email)",
    );
    expect(notifications[0]?.actorName).toBe("Synthetic Proctor");
  });
});
