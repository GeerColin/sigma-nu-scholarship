import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createReadFailure } from "@/lib/supabase/read-failure";

export { scheduleHighlights } from "@/features/schedule/state";

export type ScheduledProctor = {
  memberId: string;
  fullName: string;
};

export type ScheduleEntry = {
  occurrenceId: string;
  seriesId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location: string;
  instructions: string | null;
  cancelled: boolean;
  cancellationReason: string | null;
  startsAt: string;
  endsAt: string;
  semesterTimezone: string;
  proctors: ScheduledProctor[];
};

function scheduleProctors(value: unknown): ScheduledProctor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as { memberId?: unknown; fullName?: unknown };
    return typeof row.memberId === "string" && typeof row.fullName === "string"
      ? [{ memberId: row.memberId, fullName: row.fullName }]
      : [];
  });
}

export const getScheduleEntries = cache(
  async (
    semesterId: string,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<ScheduleEntry[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "list_study_schedule_occurrences",
      {
        target_semester_id: semesterId,
        range_start: rangeStart,
        range_end: rangeEnd,
      },
    );
    if (error) {
      throw createReadFailure("Could not load the study-session schedule.", [
        { operation: "schedule", error },
      ]);
    }
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      occurrenceId: String(row.occurrence_id),
      seriesId: String(row.series_id),
      sessionDate: String(row.session_date),
      startTime: String(row.start_time),
      endTime: String(row.end_time),
      location: String(row.location),
      instructions:
        typeof row.instructions === "string" ? row.instructions : null,
      cancelled: Boolean(row.cancelled),
      cancellationReason:
        typeof row.cancellation_reason === "string"
          ? row.cancellation_reason
          : null,
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      semesterTimezone: String(row.semester_timezone),
      proctors: scheduleProctors(row.proctors),
    }));
  },
);

export type ScheduleWeek = {
  id: string;
  sequenceNumber: number;
  label: string;
  startsOn: string;
  endsOn: string;
};

export async function getScheduleWeeks(
  semesterId: string,
): Promise<ScheduleWeek[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_weeks")
    .select("id, sequence_number, label, starts_on, ends_on")
    .eq("semester_id", semesterId)
    .order("sequence_number");
  if (error) {
    throw createReadFailure("Could not load the schedule weeks.", [
      { operation: "week", error },
    ]);
  }
  return (data ?? []).map((week) => ({
    id: week.id,
    sequenceNumber: week.sequence_number,
    label: week.label,
    startsOn: week.starts_on,
    endsOn: week.ends_on,
  }));
}

export type ScheduleSeries = {
  id: string;
  semesterId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  instructions: string | null;
  active: boolean;
  proctorMemberIds: string[];
};

export type ScheduleProctorOption = {
  id: string;
  fullName: string;
};

export async function getScheduleManagementData(
  chapterId: string,
  semesterId: string,
): Promise<{
  series: ScheduleSeries[];
  proctors: ScheduleProctorOption[];
}> {
  const supabase = await createClient();
  const [seriesResult, assignmentResult, memberResult, roleResult] =
    await Promise.all([
      supabase
        .from("study_schedule_series")
        .select(
          "id, semester_id, day_of_week, start_time, end_time, location, instructions, active",
        )
        .eq("chapter_id", chapterId)
        .eq("semester_id", semesterId)
        .eq("active", true)
        .order("day_of_week")
        .order("start_time"),
      supabase
        .from("study_schedule_series_proctors")
        .select("series_id, proctor_member_id")
        .eq("chapter_id", chapterId),
      supabase
        .from("members")
        .select("id, full_name")
        .eq("chapter_id", chapterId)
        .eq("status", "active")
        .not("profile_id", "is", null)
        .order("full_name"),
      supabase
        .from("member_roles")
        .select("member_id")
        .eq("chapter_id", chapterId)
        .eq("role", "proctor")
        .eq("active", true),
    ]);
  if (
    seriesResult.error ||
    assignmentResult.error ||
    memberResult.error ||
    roleResult.error
  ) {
    throw createReadFailure("Could not load schedule administration.", [
      { operation: "schedule", error: seriesResult.error },
      { operation: "schedule", error: assignmentResult.error },
      { operation: "members", error: memberResult.error },
      { operation: "member_linkage", error: roleResult.error },
    ]);
  }
  const proctorIds = new Set(
    (roleResult.data ?? []).map((row) => row.member_id),
  );
  const proctors = (memberResult.data ?? [])
    .filter((member) => proctorIds.has(member.id))
    .map((member) => ({ id: member.id, fullName: member.full_name }));
  const assignmentsBySeries = new Map<string, string[]>();
  for (const assignment of assignmentResult.data ?? []) {
    const current = assignmentsBySeries.get(assignment.series_id) ?? [];
    current.push(assignment.proctor_member_id);
    assignmentsBySeries.set(assignment.series_id, current);
  }
  return {
    series: (seriesResult.data ?? []).map((row) => ({
      id: row.id,
      semesterId: row.semester_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      instructions: row.instructions,
      active: row.active,
      proctorMemberIds: assignmentsBySeries.get(row.id) ?? [],
    })),
    proctors,
  };
}

export type ScheduleNotification = {
  id: string;
  occurrenceId: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
  actorName: string;
};

export async function getScheduleNotifications(
  chapterId: string,
): Promise<ScheduleNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_schedule_notifications")
    .select(
      "id, occurrence_id, before_state, after_state, created_at, read_at, profiles(display_name, email)",
    )
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    throw createReadFailure("Could not load schedule notifications.", [
      { operation: "notifications", error },
    ]);
  }
  return (data ?? []).map((row) => {
    const actor = row.profiles as unknown as {
      display_name: string | null;
      email: string;
    } | null;
    return {
      id: row.id,
      occurrenceId: row.occurrence_id,
      beforeState: (row.before_state ?? {}) as Record<string, unknown>,
      afterState: (row.after_state ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      readAt: row.read_at,
      actorName: actor?.display_name || actor?.email || "A Proctor",
    };
  });
}
